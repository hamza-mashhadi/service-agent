import { Connection, Consumer, Publisher } from 'rabbitmq-client';
import { logger } from '../utils/logger';
import { TenantUtils } from '../utils/tenantUtils';

interface MessageHandler {
  (message: unknown): Promise<void>;
}

interface SubscribeOptions {
  exchangeBase: string;
  routingKeyBase: string;
  queueBase: string;
}

export class RabbitMQService {
  private connection: Connection | null = null;
  private publisher: Publisher | null = null;
  private tenantSetup: Set<string> = new Set();

  async initRabbitMQ(): Promise<void> {
    const url = process.env.RABBITMQ_URL!;

    try {
      this.connection = new Connection(url);

      this.connection.on('connection', () => {
        logger.info('Connected to RabbitMQ');
      });

      this.connection.on('error', err => {
        logger.error('RabbitMQ connection error:', err);
      });

      this.publisher = this.connection.createPublisher({
        confirm: true,
      });

      logger.info('RabbitMQ connection established');
    } catch (error) {
      logger.error('RabbitMQ initialization failed', error);
      throw error;
    }
  }

  async setupTenantInfrastructure(tenantId: string): Promise<void> {
    if (!this.connection) {
      throw new Error('RabbitMQ connection not established');
    }

    if (this.tenantSetup.has(tenantId)) {
      return;
    }

    try {
      // Setup plan-request-job exchange and queue for tenant
      const planExchange = TenantUtils.getExchangeName(
        process.env.PLAN_REQUEST_JOB_EXCHANGE!,
        tenantId
      );
      const scheduledQueue = TenantUtils.getQueueName(
        process.env.SCHEDULED_REQUESTS_QUEUE!,
        tenantId
      );
      const scheduleRoutingKey = TenantUtils.getRoutingKey(
        process.env.SCHEDULE_ROUTING_KEY!,
        tenantId
      );

      await this.connection.exchangeDeclare({
        exchange: planExchange,
        type: 'direct',
        durable: true,
      });

      await this.connection.queueDeclare({
        queue: scheduledQueue,
        durable: true,
      });

      await this.connection.queueBind({
        queue: scheduledQueue,
        exchange: planExchange,
        routingKey: scheduleRoutingKey,
      });

      // Setup perform-request exchange for tenant (for publishing scheduled jobs)
      const performExchange = TenantUtils.getExchangeName(
        process.env.PERFORM_REQUEST_EXCHANGE!,
        tenantId
      );

      await this.connection.exchangeDeclare({
        exchange: performExchange,
        type: 'direct',
        durable: true,
      });

      this.tenantSetup.add(tenantId);
      logger.info(
        `RabbitMQ infrastructure setup completed for tenant: ${tenantId}`
      );
    } catch (error) {
      logger.error(
        `Failed to setup RabbitMQ infrastructure for tenant ${tenantId}:`,
        error
      );
      throw error;
    }
  }

  async subscribe(
    tenantId: string,
    options: SubscribeOptions,
    handler: MessageHandler
  ): Promise<Consumer> {
    if (!this.connection) {
      throw new Error('RabbitMQ connection not established');
    }

    // Ensure tenant infrastructure is setup
    await this.setupTenantInfrastructure(tenantId);

    const exchange = TenantUtils.getExchangeName(
      options.exchangeBase,
      tenantId
    );
    const queue = TenantUtils.getQueueName(options.queueBase, tenantId);
    const routingKey = TenantUtils.getRoutingKey(
      options.routingKeyBase,
      tenantId
    );

    try {
      const consumer = this.connection.createConsumer(
        {
          queue: queue,
          queueBindings: [{ exchange: exchange, routingKey: routingKey }],
          queueOptions: { durable: true },
        },
        async message => {
          try {
            let payload: unknown;

            if (typeof message.body === 'string') {
              payload = JSON.parse(message.body);
            } else {
              payload = message.body;
            }

            if (!payload) {
              logger.error('Message payload is null or undefined');
              return;
            }

            if (typeof payload !== 'object') {
              logger.error('Message payload is not an object:', typeof payload);
              return;
            }

            let requestData: unknown;
            if (payload && typeof payload === 'object' && 'body' in payload) {
              const payloadObj = payload as { body?: unknown };
              if (payloadObj.body && typeof payloadObj.body === 'string') {
                requestData = JSON.parse(payloadObj.body);
              } else if (payloadObj.body) {
                requestData = payloadObj.body;
              } else {
                requestData = payload;
              }
            } else {
              requestData = payload;
            }

            logger.info('Received message for tenant', tenantId);
            logger.info('Extracted request data:', requestData);

            await handler(requestData);
          } catch (error) {
            logger.error('Error processing message:', error);
            throw error;
          }
        }
      );
      logger.info(
        `Subscribed to queue ${queue} on exchange ${exchange} for tenant ${tenantId}`
      );
      return consumer;
    } catch (error) {
      logger.error(
        `Failed to subscribe to ${exchange} for tenant ${tenantId}`,
        error
      );
      throw error;
    }
  }

  async publish(
    tenantId: string,
    exchangeBase: string,
    message: unknown,
    routingKeyBase?: string
  ): Promise<void> {
    if (!this.publisher) {
      throw new Error('RabbitMQ publisher not initialized');
    }

    await this.setupTenantInfrastructure(tenantId);

    const exchange = TenantUtils.getExchangeName(exchangeBase, tenantId);
    const routingKey = routingKeyBase
      ? TenantUtils.getRoutingKey(routingKeyBase, tenantId)
      : exchange;

    try {
      await this.publisher.send(
        {
          exchange,
          routingKey: routingKey,
        },
        {
          body: JSON.stringify(message),
          deliveryMode: 2,
        }
      );
      logger.info(`Message published to ${exchange} for tenant ${tenantId}`);
    } catch (error) {
      logger.error(
        `Failed to publish to ${exchange} for tenant ${tenantId}`,
        error
      );
      throw error;
    }
  }

  async closeRabbit(): Promise<void> {
    try {
      if (this.publisher) await this.publisher.close();
      if (this.connection) await this.connection.close();
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', error);
    }
  }
}

export const rabbitMQService = new RabbitMQService();
