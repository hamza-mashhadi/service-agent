export interface RequestPayload {
  id: string;
  tenantId: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string> | null;
  body?: unknown | null;
}

export function isRequestPayload(payload: unknown): payload is RequestPayload {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    'id' in payload &&
    'tenantId' in payload &&
    'name' in payload &&
    'method' in payload &&
    'url' in payload
  );
}
