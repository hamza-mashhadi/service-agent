import dotenv from 'dotenv';
dotenv.config();

import { rabbitMQService } from './services/rabbitmq';
import { agendaScheduler } from './services/agenda';
import { logger } from './utils/logger';
import { config } from './config';
import { isScheduleRequestPayload } from './interfaces/scheduleRequestPayload';

const PORT = config.port;
const tenants = config.tenants;

async function start() {
  try {
    await rabbitMQService.initRabbitMQ();
    logger.info('RabbitMQ initialized');

    await agendaScheduler.start();
    logger.info('Agenda scheduler started');

    // Subscribe to plan-request-job for each tenant
    for (const tenant of tenants) {
      await rabbitMQService.subscribe(
        tenant,
        {
          exchangeBase: process.env.PLAN_REQUEST_JOB_EXCHANGE!,
          routingKeyBase: process.env.SCHEDULE_ROUTING_KEY!,
          queueBase: process.env.SCHEDULED_REQUESTS_QUEUE!,
        },
        async (payload: unknown) => {
          if (!isScheduleRequestPayload(payload)) {
            logger.error('Invalid payload received:', payload);
            throw new Error('Invalid payload: missing required fields');
          }

          try {
            logger.info(
              `Received schedule request: ${payload.id} for tenant: ${tenant}`
            );
            await agendaScheduler.scheduleRequest(payload);
            logger.info(`Successfully scheduled request: ${payload.id}`);
          } catch (error) {
            logger.error('Failed to schedule request:', error);
          }
        }
      );
      logger.info(`Subscribed to plan-request-job queue for tenant: ${tenant}`);
    }

    logger.info(`Scheduler ready on port ${PORT}`);
  } catch (err) {
    logger.error('Failed to start Scheduler:', err);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    logger.info('Shutting down Scheduler');
    await agendaScheduler.stop();
    await rabbitMQService.closeRabbit();
    process.exit(0);
  });
}

start().catch(err => {
  logger.error('Failed to start Scheduler:', err);
  process.exit(1);
});
