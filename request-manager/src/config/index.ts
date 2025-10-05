import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.REQUEST_MANAGER_PORT || '3000', 10),
  tenants: process.env.TENANTS?.split(',').map(t => t.trim()) || ['default'],
  queueUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672',
  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://localhost:27017/request-manager',
  requestCompletedExchange:
    process.env.REQUEST_COMPLETED_EXCHANGE || 'request_completed_exchange',
  requestCompletedRoutingKey:
    process.env.REQUEST_COMPLETED_ROUTING_KEY || 'request_completed',
  requestCompletedQueue:
    process.env.REQUEST_COMPLETED_QUEUE || 'request_completed_queue',
  planRequestJobExchange:
    process.env.PLAN_REQUEST_JOB_EXCHANGE || 'plan_request_job_exchange',
  scheduleRoutingKey: process.env.SCHEDULE_ROUTING_KEY || 'schedule_request',
  scheduledRequestsQueue:
    process.env.SCHEDULED_REQUESTS_QUEUE || 'scheduled_requests_queue',
  performRequestExchange:
    process.env.PERFORM_REQUEST_EXCHANGE || 'perform_request_queue',
  performRequestRoutingKey:
    process.env.PERFORM_REQUEST_ROUTING_KEY || 'perform_request',
  performRequestQueue:
    process.env.PERFORM_REQUEST_QUEUE || 'perform_request_queue',
};
