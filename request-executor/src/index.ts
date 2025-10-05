import dotenv from 'dotenv';
dotenv.config();

import { rabbitMQService } from './services/rabbitmq';
import { processRequest } from './handlers/requestHandler';
import { logger } from './utils/logger';
import { config } from './config';

const PORT = config.port;
const tenants = config.tenants;

export async function start() {
  try {
    await rabbitMQService.initRabbitMQ();
    logger.info('RabbitMQ initialized');

    // Subscribe to perform-request for each tenant
    for (const tenant of tenants) {
      await rabbitMQService.subscribe(
        tenant,
        {
          exchangeBase: config.performRequestExchange,
          routingKeyBase: config.performRequestRoutingKey,
          queueBase: config.performRequestQueue,
        },
        async payload => {
          logger.info(
            `Perform request message received for tenant ${tenant}:`,
            payload
          );
          await processRequest(payload);
        }
      );
      logger.info(`Subscribed to perform-request queue for tenant: ${tenant}`);
    }

    logger.info(`Request Executor ready on port ${PORT}`);
  } catch (err) {
    logger.error('Failed to start Request Executor:', err);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    logger.info('Shutting down Request Executor');
    await rabbitMQService.closeRabbit();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Shutting down Request Executor');
    await rabbitMQService.closeRabbit();
    process.exit(0);
  });
}

if (require.main === module) {
  start().catch(err => {
    logger.error('Failed to start Request Executor:', err);
    process.exit(1);
  });
}
