const originalEnv = process.env;

describe('Config', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default values when environment variables are not set', () => {
    delete process.env.REQUEST_EXECUTOR_PORT;
    delete process.env.TENANTS;
    delete process.env.RABBITMQ_URL;

    jest.isolateModules(() => {
      const { config: freshConfig } = require('../../config');

      expect(freshConfig.port).toBe(4000);
      expect(freshConfig.tenants).toEqual(['default']);
      expect(freshConfig.queueUrl).toBe('amqp://guest:guest@rabbitmq:5672');
    });
  });

  it('should use environment variables when set', () => {
    process.env.REQUEST_EXECUTOR_PORT = '5000';
    process.env.TENANTS = 'tenant1, tenant2, tenant3';
    process.env.RABBITMQ_URL = 'amqp://user:pass@localhost:5672';
    process.env.PERFORM_REQUEST_EXCHANGE = 'custom-exchange';

    jest.isolateModules(() => {
      const { config: freshConfig } = require('../../config');

      expect(freshConfig.port).toBe(5000);
      expect(freshConfig.tenants).toEqual(['tenant1', 'tenant2', 'tenant3']);
      expect(freshConfig.queueUrl).toBe('amqp://user:pass@localhost:5672');
      expect(freshConfig.performRequestExchange).toBe('custom-exchange');
    });
  });

  it('should trim tenant names', () => {
    process.env.TENANTS = ' tenant1 , tenant2 , tenant3 ';

    jest.isolateModules(() => {
      const { config: freshConfig } = require('../../config');
      expect(freshConfig.tenants).toEqual(['tenant1', 'tenant2', 'tenant3']);
    });
  });

  it('should handle invalid port numbers', () => {
    process.env.REQUEST_EXECUTOR_PORT = 'invalid';

    jest.isolateModules(() => {
      const { config: freshConfig } = require('../../config');
      expect(freshConfig.port).toBeNaN();
    });
  });
});
