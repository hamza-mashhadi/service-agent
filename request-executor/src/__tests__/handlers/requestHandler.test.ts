import axios from 'axios';
import { processRequest } from '../../handlers/requestHandler';
import { logger } from '../../utils/logger';
import { rabbitMQService } from '../../services/rabbitmq';
import { config } from '../../config';
import { RequestPayload } from '../../interfaces/requestPayload';

jest.mock('axios');
jest.mock('../../utils/logger');
jest.mock('../../services/rabbitmq');
jest.mock('../../config');

const mockAxios = axios as jest.MockedFunction<typeof axios>;
const mockRabbitMQService = rabbitMQService as jest.Mocked<
  typeof rabbitMQService
>;

describe('RequestHandler', () => {
  const mockPayload: RequestPayload = {
    id: '123',
    tenantId: 'tenant1',
    name: 'test-request',
    method: 'GET',
    url: 'https://api.example.com/test',
    headers: { 'Content-Type': 'application/json' },
    body: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (config as any).requestCompletedExchange = 'request-completed';
    (config as any).requestCompletedRoutingKey = 'completed';
    mockRabbitMQService.publish.mockResolvedValue(undefined);
  });

  describe('processRequest', () => {
    it('should process successful request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        data: { success: true },
      };

      mockAxios.mockResolvedValue(mockResponse);

      await processRequest(mockPayload);

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: { 'Content-Type': 'application/json' },
        data: undefined,
      });

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'tenant1',
        'request-completed',
        expect.objectContaining({
          id: '123',
          tenantId: 'tenant1',
          status: 'completed',
          response: mockResponse,
        }),
        'completed'
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Request 123 completed successfully')
      );
    });

    it('should handle failed request', async () => {
      const mockError = {
        message: 'Request failed',
        code: 'ECONNREFUSED',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Server error' },
        },
      };

      mockAxios.mockRejectedValue(mockError);

      await processRequest(mockPayload);

      expect(mockRabbitMQService.publish).toHaveBeenCalledWith(
        'tenant1',
        'request-completed',
        expect.objectContaining({
          id: '123',
          tenantId: 'tenant1',
          status: 'failed',
          error: {
            message: 'Request failed',
            code: 'ECONNREFUSED',
            response: mockError.response,
          },
        }),
        'completed'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Request 123 failed'),
        'Request failed'
      );
    });

    it('should handle POST request with body', async () => {
      const postPayload = {
        ...mockPayload,
        method: 'POST',
        body: { data: 'test' },
      };

      const mockResponse = {
        status: 201,
        statusText: 'Created',
        headers: {},
        data: { id: 'new-id' },
      };

      mockAxios.mockResolvedValue(mockResponse);

      await processRequest(postPayload);

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/test',
        headers: { 'Content-Type': 'application/json' },
        data: { data: 'test' },
      });
    });

    it('should handle request without headers', async () => {
      const payloadWithoutHeaders = {
        ...mockPayload,
        headers: null,
      };

      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: {},
      };

      mockAxios.mockResolvedValue(mockResponse);

      await processRequest(payloadWithoutHeaders);

      expect(mockAxios).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://api.example.com/test',
        headers: {},
        data: undefined,
      });
    });
  });
});
