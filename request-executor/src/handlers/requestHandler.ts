import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import { rabbitMQService } from '../services/rabbitmq';
import { config } from '../config';
import { isRequestPayload, RequestPayload } from '../interfaces/requestPayload';

export async function processRequest(payload: unknown): Promise<void> {
  if (!isRequestPayload(payload)) {
    logger.error('Invalid payload received:', payload);
    throw new Error('Invalid payload: missing required fields');
  }

  const requestData: RequestPayload = payload;

  logger.info(
    `Processing request ${requestData.id} for tenant ${requestData.tenantId}`
  );

  try {
    const startTime = Date.now();

    const response: AxiosResponse = await axios({
      method: requestData.method as AxiosRequestConfig['method'],
      url: requestData.url,
      headers: requestData.headers || {},
      data: requestData.body || undefined,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const completedPayload = {
      id: requestData.id,
      tenantId: requestData.tenantId,
      status: 'completed',
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      },
      executionTime: duration,
      completedAt: new Date().toISOString(),
    };

    // Publish to tenant-specific request-completed exchange
    await rabbitMQService.publish(
      requestData.tenantId,
      config.requestCompletedExchange,
      completedPayload,
      config.requestCompletedRoutingKey
    );

    logger.info(
      `Request ${requestData.id} completed successfully for tenant ${requestData.tenantId} in ${duration}ms`
    );
  } catch (error: unknown) {
    const axiosError = error as AxiosError;

    logger.error(
      `Request ${requestData.id} failed for tenant ${requestData.tenantId}:`,
      axiosError.message
    );

    const failedPayload = {
      id: requestData.id,
      tenantId: requestData.tenantId,
      status: 'failed',
      error: {
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response
          ? {
              status: axiosError.response.status,
              statusText: axiosError.response.statusText,
              data: axiosError.response.data,
            }
          : null,
      },
      completedAt: new Date().toISOString(),
    };

    await rabbitMQService.publish(
      requestData.tenantId,
      config.requestCompletedExchange,
      failedPayload,
      config.requestCompletedRoutingKey
    );
  }
}
