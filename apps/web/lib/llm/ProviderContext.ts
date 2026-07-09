export interface ProviderContext {
  requestId: string;
  workerId?: string;
  sessionId?: string;
  locale?: string;
  metadata?: Record<string, string>;
}

export function createProviderContext(overrides: Partial<ProviderContext> = {}): ProviderContext {
  return {
    requestId: overrides.requestId ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workerId: overrides.workerId,
    sessionId: overrides.sessionId,
    locale: overrides.locale ?? "en",
    metadata: overrides.metadata,
  };
}
