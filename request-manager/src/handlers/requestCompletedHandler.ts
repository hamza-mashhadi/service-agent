import { isRequestCompletedMessage } from '../interfaces/requestPayload';
import { Request } from '../models/Request';
import { logger } from '../utils/logger';

export async function handleRequestCompleted(message: unknown): Promise<void> {
  if (!isRequestCompletedMessage(message)) {
    logger.error('Invalid request completed message received:', message);
    return;
  }

  try {
    logger.info('Processing request completed message:', message);

    const { id, response, status: requestStatus, tenantId } = message;

    if (!id) {
      logger.error('Request completed message missing id');
      return;
    }

    if (!tenantId) {
      logger.error('Request completed message missing tenantId');
      return;
    }

    const request = await Request.findOne({ _id: id, tenantId });
    if (!request) {
      logger.error(
        `Request with id ${id} not found in database for tenant ${tenantId}`
      );
      return;
    }

    let finalStatus: string;

    if (requestStatus === 'completed' && response && response.status) {
      if (response.status >= 200 && response.status < 300) {
        finalStatus = 'success';
      } else {
        finalStatus = 'failed';
      }
    } else if (requestStatus === 'failed') {
      finalStatus = 'failed';
    } else {
      finalStatus = 'completed';
    }

    await Request.findOneAndUpdate(
      { _id: id, tenantId },
      {
        response: message,
        status: finalStatus,
        updatedAt: new Date(),
      }
    );

    logger.info(
      `Request ${id} updated with status: ${finalStatus} for tenant ${tenantId}`
    );

    if (response && response.status) {
      logger.info(`HTTP status: ${response.status}`);
    }
  } catch (error) {
    logger.error('Error handling request completed message:', error);
    throw error;
  }
}
