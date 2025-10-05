import Agenda, { Job } from 'agenda';
import { logger } from '../utils/logger';
import { rabbitMQService } from './rabbitmq';
import { JobData } from '../interfaces/jobData';
import { ScheduleRequestPayload } from '../interfaces/scheduleRequestPayload';

export class AgendaScheduler {
  private agenda: Agenda;

  constructor(mongoUrl: string) {
    this.agenda = new Agenda({
      db: { address: mongoUrl },
      processEvery: '5 seconds',
      maxConcurrency: 20,
      defaultConcurrency: 5,
    });

    this.setupEventListeners();
    this.setupJobs();
  }

  private setupEventListeners(): void {
    this.agenda.on('ready', () => {
      logger.info('Agenda is ready and connected to MongoDB');
    });

    this.agenda.on('start', job => {
      logger.info(
        `Job ${job.attrs.name} starting at ${new Date().toISOString()}`
      );
      logger.info(`Job data:`, job.attrs.data);
    });

    this.agenda.on('complete', job => {
      logger.info(
        `Job ${job.attrs.name} completed at ${new Date().toISOString()}`
      );
    });

    this.agenda.on('fail', (err, job) => {
      logger.error(`Job ${job.attrs.name} failed:`, err);
    });

    this.agenda.on('error', error => {
      logger.error('Agenda error:', error);
    });
  }

  private setupJobs(): void {
    this.agenda.define(
      'execute-scheduled-request',
      async (job: Job<JobData>) => {
        const { requestData } = job.attrs.data;

        try {
          logger.info(
            `Executing scheduled request: ${requestData.id} for tenant: ${requestData.tenantId}`
          );

          const executionPayload = {
            ...requestData,
            schedule: undefined,
          };

          await rabbitMQService.publish(
            requestData.tenantId,
            process.env.PERFORM_REQUEST_EXCHANGE!,
            executionPayload,
            process.env.PERFORM_REQUEST_ROUTING_KEY!
          );

          logger.info(
            `Successfully published scheduled request ${requestData.id} for execution (tenant: ${requestData.tenantId})`
          );
        } catch (error) {
          logger.error(
            `Failed to execute scheduled request ${requestData.id} (tenant: ${requestData.tenantId}):`,
            error
          );
          throw error;
        }
      }
    );
  }

  async start(): Promise<void> {
    try {
      await this.agenda.start();
      logger.info('Agenda started successfully');

      await this.processMissedJobs();

      logger.info('Agenda scheduler fully started and ready');
    } catch (error) {
      logger.error('Failed to start Agenda scheduler:', error);
      throw error;
    }
  }

  private async processMissedJobs(): Promise<void> {
    try {
      const now = new Date();

      const missedJobs = await this.agenda.jobs({
        name: 'execute-scheduled-request',
        nextRunAt: { $lt: now },
        lockedAt: null,
      });

      if (missedJobs.length > 0) {
        logger.info(
          `Found ${missedJobs.length} missed jobs, executing them now...`
        );

        for (const job of missedJobs) {
          try {
            const jobData = job.attrs.data as JobData;
            logger.info(
              `Executing missed job for request: ${jobData.requestData.id} (tenant: ${jobData.requestData.tenantId})`
            );

            // Execute the job immediately
            await job.run();

            // Remove the job after execution to prevent it from running again
            await job.remove();

            logger.info(
              `Successfully executed missed job for request: ${jobData.requestData.id}`
            );
          } catch (error) {
            logger.error(`Failed to execute missed job:`, error);
            await job.fail(error as Error);
          }
        }
      } else {
        logger.info('No missed jobs found');
      }
    } catch (error) {
      logger.error('Error processing missed jobs:', error);
    }
  }

  async scheduleRequest(requestData: ScheduleRequestPayload): Promise<void> {
    logger.info('Scheduling request with data:', requestData);

    if (!requestData.schedule) {
      throw new Error('Schedule date is required');
    }

    if (!requestData.tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!requestData.id) {
      throw new Error('Request ID is required');
    }

    const scheduleDate = new Date(requestData.schedule);
    const now = new Date();

    logger.info(`Schedule date: ${scheduleDate.toISOString()}`);
    logger.info(`Current time: ${now.toISOString()}`);
    logger.info(
      `Time until execution: ${scheduleDate.getTime() - now.getTime()}ms`
    );

    if (scheduleDate <= now) {
      throw new Error('Scheduled time must be in the future');
    }

    const jobData: JobData = {
      requestId: requestData.id,
      requestData: requestData,
    };

    logger.info('Creating agenda job with data:', jobData);

    const job = await this.agenda.schedule(
      scheduleDate,
      'execute-scheduled-request',
      jobData
    );

    logger.info(`Job created with ID: ${job.attrs._id}`);
    logger.info(`Job scheduled for: ${job.attrs.nextRunAt?.toISOString()}`);
    logger.info(
      `Scheduled request ${requestData.id} for ${scheduleDate.toISOString()} (tenant: ${requestData.tenantId})`
    );

    const savedJobs = await this.agenda.jobs({ _id: job.attrs._id });
    if (savedJobs.length > 0) {
      logger.info(`Verified job ${job.attrs._id} was saved to database`);
      logger.info(
        `Job nextRunAt: ${savedJobs[0].attrs.nextRunAt?.toISOString()}`
      );
    } else {
      logger.error(`Failed to verify job ${job.attrs._id} in database`);
    }
  }

  //maybe if I find enough time I will add option to cancel a scheduled job from the UI
  async cancelScheduledRequest(
    requestId: string,
    tenantId: string
  ): Promise<void> {
    const cancelledJobs = await this.agenda.cancel({
      'data.requestId': requestId,
      'data.requestData.tenantId': tenantId,
    });

    logger.info(
      `Cancelled ${cancelledJobs} scheduled jobs for request ${requestId} (tenant: ${tenantId})`
    );
  }

  async stop(): Promise<void> {
    await this.agenda.stop();
    logger.info('Agenda scheduler stopped');
  }
}

export const agendaScheduler = new AgendaScheduler(
  process.env.SCHEDULER_MONGODB_URI!
);
