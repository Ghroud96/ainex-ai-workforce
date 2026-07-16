import type { KnowledgeSource, KnowledgeSourceType } from "@/lib/knowledge-engine/KnowledgeSourceTypes";

// In-memory registry of KnowledgeSource instances — the same
// globalThis-anchored pattern every store in this codebase uses
// (SalesDealStore, UploadedDocumentStore, WorkerAnalysisResultStore),
// chosen because Next.js/Turbopack can evaluate this module more than
// once across separate bundle graphs in dev. Only "document" sources are
// ever registered today (one per upload, from CompanySourceIngestion.ts)
// — a future connector registers its own KnowledgeSource the same way.
class KnowledgeSourceStoreImpl {
  private sources: KnowledgeSource[] = [];

  register(source: KnowledgeSource): void {
    const index = this.sources.findIndex((existing) => existing.sourceId === source.sourceId);
    if (index >= 0) {
      this.sources[index] = source;
    } else {
      this.sources.push(source);
    }
  }

  get(sourceId: string): KnowledgeSource | undefined {
    return this.sources.find((source) => source.sourceId === sourceId);
  }

  getAll(sourceType?: KnowledgeSourceType): KnowledgeSource[] {
    return sourceType ? this.sources.filter((source) => source.sourceType === sourceType) : [...this.sources];
  }

  clear(): void {
    this.sources = [];
  }
}

const GLOBAL_KEY = Symbol.for("ainex.KnowledgeSourceStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: KnowledgeSourceStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const KnowledgeSourceStore: KnowledgeSourceStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new KnowledgeSourceStoreImpl());
