export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderMetricsSnapshot {
  providerId: string;
  latencyMs: number;
  requestCount: number;
  averageResponseTimeMs: number;
  tokenUsage: TokenUsageMetrics;
  estimatedCostUsd: number;
  failureRate: number;
}

export interface ProviderMetricsSample {
  latencyMs?: number;
  tokenUsage?: TokenUsageMetrics;
  estimatedCostUsd?: number;
  failed?: boolean;
}

export interface ProviderMetricsCollector {
  record(providerId: string, sample: ProviderMetricsSample): void;
  snapshot(providerId: string): ProviderMetricsSnapshot;
}

function emptySnapshot(providerId: string): ProviderMetricsSnapshot {
  return {
    providerId,
    latencyMs: 0,
    requestCount: 0,
    averageResponseTimeMs: 0,
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    estimatedCostUsd: 0,
    failureRate: 0,
  };
}

// Architecture only — this phase records nothing. Every call to record()
// is a no-op and every snapshot() returns zeroed values, regardless of how
// many requests were made. Real aggregation is a future phase.
class NoopProviderMetricsCollector implements ProviderMetricsCollector {
  record(): void {}

  snapshot(providerId: string): ProviderMetricsSnapshot {
    return emptySnapshot(providerId);
  }
}

export const providerMetricsCollector: ProviderMetricsCollector = new NoopProviderMetricsCollector();
