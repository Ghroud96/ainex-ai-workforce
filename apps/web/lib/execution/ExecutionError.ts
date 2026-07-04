export interface ExecutionErrorDetail {
  message: string;
  retryable: boolean;
  occurredAt: string;
}

export function createExecutionError(message: string, retryable = true): ExecutionErrorDetail {
  return { message, retryable, occurredAt: new Date().toISOString() };
}
