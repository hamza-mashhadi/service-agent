import { Connection } from 'rabbitmq-client';
import { RabbitMQService } from '../../services/rabbitmq';
import { logger } from '../../utils/logger';
import { TenantUtils } from '../../utils/tenantUtils';
import { config } from '../../config';

jest.mock('rabbitmq-client');
jest.mock('../../utils/logger');
jest.mock('../../utils/tenantUtils');
jest.mock('../../config');

const MockConnection = Connection as jest.MockedClass<typeof Connection>;

describe('RabbitMQService', () => {
  let rabbitMQService: RabbitMQService;
  let mockConnection: jest.Mocked<Connection>;
  let mockPublisher: any;
  let mockConsumer: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPublisher = {
      send: jest.fn(),
      close: jest.fn(),
    };

    mockConsumer = {
      close: jest.fn(),
    };

    mockConnection = {
      on: jest.fn(),
      createPublisher: jest.fn().mockReturnValue(mockPublisher),
      createConsumer: jest.fn().mockReturnValue(mockConsumer),
      exchangeDeclare: jest.fn(),
      queueDeclare: jest.fn(),
      queueBind: jest.fn(),
      close: jest.fn(),
    } as any;

    MockConnection.mockImplementation(() => mockConnection);

    (config as any).queueUrl = 'amqp://test';
    (config as any).performRequestExchange = 'perform-request';
    (config as any).performRequestQueue = 'perform-request-queue';
    (config as any).performRequestRoutingKey = 'perform-request';
    (config as any).requestCompletedExchange = 'request-completed';
    (config as any).requestCompletedQueue = 'request-completed-queue';
    (config as any).requestCompletedRoutingKey = 'completed';

    (TenantUtils.getExchangeName as jest.Mock).mockReturnValue(
      'test-exchange-tenant1'
    );
    (TenantUtils.getQueueName as jest.Mock).mockReturnValue(
      'test-queue-tenant1'
    );
    (TenantUtils.getRoutingKey as jest.Mock).mockReturnValue(
      'test-routing-tenant1'
    );

    rabbitMQService = new RabbitMQService();
  });

  describe('initRabbitMQ', () => {
    it('should initialize RabbitMQ connection successfully', async () => {
      await rabbitMQService.initRabbitMQ();

      expect(MockConnection).toHaveBeenCalledWith('amqp://test');
      expect(mockConnection.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function)
      );
      expect(mockConnection.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(mockConnection.createPublisher).toHaveBeenCalledWith({
        confirm: true,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'RabbitMQ connection established'
      );
    });

    it('should handle connection errors', async () => {
      MockConnection.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await expect(rabbitMQService.initRabbitMQ()).rejects.toThrow(
        'Connection failed'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'RabbitMQ initialization failed',
        expect.any(Error)
      );
    });
  });

  describe('setupTenantInfrastructure', () => {
    beforeEach(async () => {
      await rabbitMQService.initRabbitMQ();
    });

    it('should setup tenant infrastructure successfully', async () => {
      await rabbitMQService.setupTenantInfrastructure('tenant1');

      expect(logger.info).toHaveBeenCalledWith(
        'RabbitMQ infrastructure setup completed for tenant: tenant1'
      );
    });

    it('should not setup infrastructure twice for same tenant', async () => {
      await rabbitMQService.setupTenantInfrastructure('tenant1');
      await rabbitMQService.setupTenantInfrastructure('tenant1');

      expect(mockConnection.exchangeDeclare).toHaveBeenCalledTimes(2);
      expect(mockConnection.queueDeclare).toHaveBeenCalledTimes(2);
      expect(mockConnection.queueBind).toHaveBeenCalledTimes(2);
    });

    it('should handle setup errors', async () => {
      mockConnection.exchangeDeclare.mockRejectedValue(
        new Error('Exchange declare failed')
      );

      await expect(
        rabbitMQService.setupTenantInfrastructure('tenant1')
      ).rejects.toThrow('Exchange declare failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to setup RabbitMQ infrastructure for tenant tenant1:',
        expect.any(Error)
      );
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      await rabbitMQService.initRabbitMQ();
    });

    it('should subscribe to queue successfully', async () => {
      const handler = jest.fn();
      const options = {
        exchangeBase: 'test-exchange',
        routingKeyBase: 'test-routing',
        queueBase: 'test-queue',
      };

      const result = await rabbitMQService.subscribe(
        'tenant1',
        options,
        handler
      );

      expect(mockConnection.createConsumer).toHaveBeenCalled();
      expect(result).toBe(mockConsumer);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Subscribed to queue')
      );
    });

    it('should handle subscription errors', async () => {
      mockConnection.createConsumer.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      const handler = jest.fn();
      const options = {
        exchangeBase: 'test-exchange',
        routingKeyBase: 'test-routing',
        queueBase: 'test-queue',
      };

      await expect(
        rabbitMQService.subscribe('tenant1', options, handler)
      ).rejects.toThrow('Subscription failed');
    });

    it('should process messages correctly', async () => {
      const handler = jest.fn();
      const options = {
        exchangeBase: 'test-exchange',
        routingKeyBase: 'test-routing',
        queueBase: 'test-queue',
      };

      let messageHandler: any;
      mockConnection.createConsumer.mockImplementation((config, handler) => {
        messageHandler = handler;
        return mockConsumer;
      });

      await rabbitMQService.subscribe('tenant1', options, handler);

      const testMessage = {
        body: JSON.stringify({ id: '123', data: 'test' }),
      };

      await messageHandler(testMessage);

      expect(handler).toHaveBeenCalledWith({ id: '123', data: 'test' });
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      await rabbitMQService.initRabbitMQ();
    });

    it('should publish message successfully', async () => {
      const message = { id: '123', data: 'test' };

      await rabbitMQService.publish(
        'tenant1',
        'test-exchange',
        message,
        'test-routing'
      );

      expect(mockPublisher.send).toHaveBeenCalledWith(
        {
          exchange: 'test-exchange-tenant1',
          routingKey: 'test-routing-tenant1',
        },
        {
          body: JSON.stringify(message),
          deliveryMode: 2,
        }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Message published to test-exchange-tenant1 for tenant tenant1'
      );
    });

    it('should publish without routing key', async () => {
      const message = { id: '123', data: 'test' };

      await rabbitMQService.publish('tenant1', 'test-exchange', message);

      expect(mockPublisher.send).toHaveBeenCalledWith(
        {
          exchange: 'test-exchange-tenant1',
          routingKey: 'test-exchange-tenant1',
        },
        {
          body: JSON.stringify(message),
          deliveryMode: 2,
        }
      );
    });

    it('should handle publish errors', async () => {
      mockPublisher.send.mockRejectedValue(new Error('Publish failed'));

      await expect(
        rabbitMQService.publish('tenant1', 'test-exchange', {})
      ).rejects.toThrow('Publish failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish to test-exchange-tenant1 for tenant tenant1',
        expect.any(Error)
      );
    });

    it('should throw error if publisher not initialized', async () => {
      const service = new RabbitMQService();

      await expect(
        service.publish('tenant1', 'test-exchange', {})
      ).rejects.toThrow('RabbitMQ publisher not initialized');
    });
  });

  describe('closeRabbit', () => {
    it('should close connections gracefully', async () => {
      await rabbitMQService.initRabbitMQ();
      await rabbitMQService.closeRabbit();

      expect(mockPublisher.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });

    it('should handle close errors gracefully', async () => {
      await rabbitMQService.initRabbitMQ();
      mockConnection.close.mockRejectedValue(new Error('Close failed'));

      await rabbitMQService.closeRabbit();

      expect(logger.error).toHaveBeenCalledWith(
        'Error closing RabbitMQ connection',
        expect.any(Error)
      );
    });

    it('should handle missing connections gracefully', async () => {
      await rabbitMQService.closeRabbit();

      expect(logger.info).toHaveBeenCalledWith('RabbitMQ connection closed');
    });
  });
});
