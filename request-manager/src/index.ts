import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectMongoDB, disconnectMongoDB } from './services/db';
import { rabbitMQService } from './services/rabbitmq';
import { logger } from './utils/logger';
import { handleRequestCompleted } from './handlers/requestCompletedHandler';
import { config } from './config';

const PORT = config.port;
const tenants = config.tenants;

async function start() {
  try {
    await connectMongoDB();
    logger.info('MongoDB initialized');
  } catch (err) {
    logger.error('MongoDB init failed', err);
    process.exit(1);
  }

  try {
    await rabbitMQService.initRabbitMQ();
    logger.info('RabbitMQ initialized');

    // Subscribe to request-completed for each tenant
    for (const tenant of tenants) {
      await rabbitMQService.subscribe(
        tenant,
        {
          exchangeBase: config.requestCompletedExchange,
          routingKeyBase: config.requestCompletedRoutingKey,
          queueBase: config.requestCompletedQueue,
        },
        async payload => {
          logger.info(
            `request-completed message received for tenant ${tenant}:`,
            payload
          );
          await handleRequestCompleted(payload);
        }
      );
      logger.info(
        `Subscribed to request-completed queue for tenant: ${tenant}`
      );
    }
  } catch (err) {
    logger.error('RabbitMQ connection failed', err);
  }

  const app = createApp();
  const server = app.listen(PORT, () => logger.info(`Listening on ${PORT}`));

  process.on('SIGINT', async () => {
    logger.info('Shutting down');
    server.close(() => logger.info('HTTP server closed'));
    await rabbitMQService.closeRabbit();
    await disconnectMongoDB();
    process.exit(0);
  });
}

start()
  .then(_r => console.log('Server started...'))
  .catch(err => console.error('Failed to start server', err));
