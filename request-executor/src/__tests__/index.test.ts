import { rabbitMQService } from '../services/rabbitmq';
import { processRequest } from '../handlers/requestHandler';
import { logger } from '../utils/logger';
import { config } from '../config';

jest.mock('../services/rabbitmq');
jest.mock('../handlers/requestHandler');
jest.mock('../utils/logger');
jest.mock('../config');

const mockRabbitMQService = rabbitMQService as jest.Mocked<
  typeof rabbitMQService
>;
const mockProcessRequest = processRequest as jest.MockedFunction<
  typeof processRequest
>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockConfig = config as jest.Mocked<typeof config>;

const mockConsumer = {
  close: jest.fn(),
} as any;

describe('Request Executor Index', () => {
  let originalProcessExit: any;
  let processExitSpy: jest.SpyInstance;

  beforeAll(() => {
    originalProcessExit = process.exit;
  });

  afterAll(() => {
    process.exit = originalProcessExit;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation((() => {}) as any);

    (mockConfig as any).port = 3000;
    (mockConfig as any).tenants = ['tenant1', 'tenant2'];
    (mockConfig as any).performRequestExchange = 'test-exchange';
    (mockConfig as any).performRequestRoutingKey = 'test-routing';
    (mockConfig as any).performRequestQueue = 'test-queue';

    mockRabbitMQService.initRabbitMQ.mockResolvedValue(undefined);
    mockRabbitMQService.subscribe.mockResolvedValue(mockConsumer);
    mockRabbitMQService.closeRabbit.mockResolvedValue(undefined);
    mockProcessRequest.mockResolvedValue(undefined);
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  describe('start function', () => {
    it('should initialize RabbitMQ successfully', async () => {
      jest.isolateModules(async () => {
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockRabbitMQService.initRabbitMQ).toHaveBeenCalledTimes(1);
        expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ initialized');
        expect(processExitSpy).not.toHaveBeenCalled();
      });
    });

    it('should subscribe to queues for all tenants', async () => {
      jest.isolateModules(async () => {
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockRabbitMQService.subscribe).toHaveBeenCalledTimes(2);
        expect(mockRabbitMQService.subscribe).toHaveBeenCalledWith(
          'tenant1',
          {
            exchangeBase: 'test-exchange',
            routingKeyBase: 'test-routing',
            queueBase: 'test-queue',
          },
          expect.any(Function)
        );
        expect(mockRabbitMQService.subscribe).toHaveBeenCalledWith(
          'tenant2',
          {
            exchangeBase: 'test-exchange',
            routingKeyBase: 'test-routing',
            queueBase: 'test-queue',
          },
          expect.any(Function)
        );
      });
    });

    it('should handle RabbitMQ initialization failure', async () => {
      mockRabbitMQService.initRabbitMQ.mockRejectedValue(
        new Error('Connection failed')
      );

      jest.isolateModules(async () => {
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to start Request Executor:',
          expect.any(Error)
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });

    it('should handle subscription failure', async () => {
      mockRabbitMQService.subscribe.mockRejectedValue(
        new Error('Subscription failed')
      );

      jest.isolateModules(async () => {
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to start Request Executor:',
          expect.any(Error)
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('message handler', () => {
    it('should process incoming messages correctly', async () => {
      let messageHandler: ((message: any) => Promise<void>) | undefined;

      mockRabbitMQService.subscribe.mockImplementation(
        async (tenant, config, handler) => {
          messageHandler = handler;
          return mockConsumer;
        }
      );

      jest.isolateModules(async () => {
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(messageHandler).toBeDefined();

        const testPayload = { requestId: '123', data: 'test' };
        await messageHandler!(testPayload);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Perform request message received'),
          testPayload
        );
        expect(mockProcessRequest).toHaveBeenCalledWith(testPayload);
      });
    });
  });

  describe('signal handlers', () => {
    it('should handle SIGINT gracefully', async () => {
      jest.isolateModules(async () => {
        const processOnSpy = jest.spyOn(process, 'on');
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(processOnSpy).toHaveBeenCalledWith(
          'SIGINT',
          expect.any(Function)
        );
        expect(processOnSpy).toHaveBeenCalledWith(
          'SIGTERM',
          expect.any(Function)
        );

        const sigintCall = processOnSpy.mock.calls.find(
          call => call[0] === 'SIGINT'
        );
        if (sigintCall) {
          const sigintHandler = sigintCall[1] as Function;
          await sigintHandler();
        }

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Shutting down Request Executor'
        );
        expect(mockRabbitMQService.closeRabbit).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(0);

        processOnSpy.mockRestore();
      });
    });

    it('should handle SIGTERM gracefully', async () => {
      jest.isolateModules(async () => {
        const processOnSpy = jest.spyOn(process, 'on');
        const { start } = require('../index');
        await start();
        await new Promise(resolve => setTimeout(resolve, 100));

        const sigtermCall = processOnSpy.mock.calls.find(
          call => call[0] === 'SIGTERM'
        );
        if (sigtermCall) {
          const sigtermHandler = sigtermCall[1] as Function;
          await sigtermHandler();
        }

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Shutting down Request Executor'
        );
        expect(mockRabbitMQService.closeRabbit).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(0);

        processOnSpy.mockRestore();
      });
    });
  });
});
