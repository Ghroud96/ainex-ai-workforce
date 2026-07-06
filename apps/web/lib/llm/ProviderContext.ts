export interface ProviderContext {
  requestId: string;
  workerId?: string;
  sessionId?: string;
  locale?: string;
  metadata?: Record<string, string>;
  // An explicit, narrowly-scoped escape hatch from the global Demo/Live AI
  // toggle for exactly one call. Undefined/false everywhere except the one
  // Teach AINEX call site — every other existing caller never sets this,
  // so they are byte-for-byte unaffected.
  forceLiveAi?: boolean;
}

export function createProviderContext(overrides: Partial<ProviderContext> = {}): ProviderContext {
  return {
    requestId: overrides.requestId ?? `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workerId: overrides.workerId,
    sessionId: overrides.sessionId,
    locale: overrides.locale ?? "en",
    metadata: overrides.metadata,
    forceLiveAi: overrides.forceLiveAi,
  };
}
