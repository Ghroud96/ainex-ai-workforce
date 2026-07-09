// Tracks which documents have ever actually been cited as a knowledge
// source in a worker's AI analysis (see
// lib/services/knowledge/WorkerAnalysisService.ts::analyzeDocumentForWorker,
// the one real "a worker used these documents" event) — the one thing the
// existing seven-stage processingStage pipeline doesn't capture, and the
// missing piece of the "Referenced by AI" Knowledge Lifecycle stage. In-
// memory, globalThis-anchored, same pattern as every other store in this
// app (see lib/enterprise/CompanyProfileStore.ts's doc comment for why).
class KnowledgeReferenceStoreImpl {
  private referencedIds = new Set<string>();

  markReferenced(ids: string[]): void {
    for (const id of ids) {
      this.referencedIds.add(id);
    }
  }

  hasBeenReferenced(id: string): boolean {
    return this.referencedIds.has(id);
  }
}

const GLOBAL_KEY = Symbol.for("ainex.KnowledgeReferenceStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: KnowledgeReferenceStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const KnowledgeReferenceStore: KnowledgeReferenceStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new KnowledgeReferenceStoreImpl());
