export interface RequestPayload {
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string> | null;
  body?: unknown | null;
  schedule?: string | null; // ISO string
  executeNow?: boolean;
}

export interface RequestCompletedMessage {
  id: string;
  tenantId: string;
  status: 'completed' | 'failed';
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, unknown>;
    data: unknown;
  };
  error?: {
    message: string;
    code?: string;
    response?: {
      status: number;
      statusText: string;
      data: unknown;
    };
  };
  executionTime?: number;
  completedAt: string;
}

export function isRequestCompletedMessage(
  payload: unknown
): payload is RequestCompletedMessage {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const msg = payload as Record<string, unknown>;

  return (
    typeof msg.id === 'string' &&
    typeof msg.tenantId === 'string' &&
    typeof msg.status === 'string' &&
    (msg.status === 'completed' || msg.status === 'failed') &&
    typeof msg.completedAt === 'string'
  );
}
