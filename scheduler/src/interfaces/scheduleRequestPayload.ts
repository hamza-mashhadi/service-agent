export interface ScheduleRequestPayload {
  id: string;
  tenantId: string;
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string> | null;
  body?: unknown | null;
  schedule: string;
}

export function isScheduleRequestPayload(
  payload: unknown
): payload is ScheduleRequestPayload {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    'id' in payload &&
    'tenantId' in payload &&
    'name' in payload &&
    'method' in payload &&
    'url' in payload &&
    'schedule' in payload
  );
}
