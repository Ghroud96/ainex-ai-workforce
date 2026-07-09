// Scoped ONLY to the "Teach AINEX about your company" feature's own
// uploads/Live AI calls — NOT a general provider-wide usage metering
// system (see lib/llm/Provider.ts's CostEstimate and
// lib/llm/ProviderMetrics.ts's NoopProviderMetricsCollector, both
// explicitly "architecture only, records nothing"). Cost is a flat,
// stated assumption, not real billing data: a rough, conservative
// per-call USD estimate converted to RM at a fixed rate — both numbers
// are placeholders and must be visibly labeled as estimates in the UI,
// never presented as an invoice. In-memory, resets on server restart —
// same demo-scoped globalThis-anchored pattern as UploadedDocumentStore.ts.
const ESTIMATED_COST_USD_PER_LIVE_CALL = 0.01;
const USD_TO_RM_RATE = 4.7;

export interface TeachAinexSessionSnapshot {
  uploadCount: number;
  liveAiCallCount: number;
  workersUpdatedCount: number;
  estimatedCostRm: number;
}

class TeachAinexSessionStoreImpl {
  private uploadCount = 0;
  private liveAiCallCount = 0;
  private workersUpdated = new Set<string>();

  recordUpload(): void {
    this.uploadCount += 1;
  }

  recordLiveAiCall(): void {
    this.liveAiCallCount += 1;
  }

  recordWorkersUpdated(workerSlugs: string[]): void {
    for (const slug of workerSlugs) {
      this.workersUpdated.add(slug);
    }
  }

  // The "start a fresh demo" safety valve's counterpart to
  // UploadedDocumentStore.clear() — always called together, see
  // app/knowledge/teachAinexActions.ts::resetTeachAinexSession().
  reset(): void {
    this.uploadCount = 0;
    this.liveAiCallCount = 0;
    this.workersUpdated = new Set<string>();
  }

  snapshot(): TeachAinexSessionSnapshot {
    const estimatedCostUsd = this.liveAiCallCount * ESTIMATED_COST_USD_PER_LIVE_CALL;
    return {
      uploadCount: this.uploadCount,
      liveAiCallCount: this.liveAiCallCount,
      workersUpdatedCount: this.workersUpdated.size,
      estimatedCostRm: Number((estimatedCostUsd * USD_TO_RM_RATE).toFixed(2)),
    };
  }
}

const GLOBAL_KEY = Symbol.for("ainex.TeachAinexSessionStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: TeachAinexSessionStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const TeachAinexSessionStore: TeachAinexSessionStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new TeachAinexSessionStoreImpl());
