import type { KnowledgeJob } from "@/lib/knowledge-engine/KnowledgeJobTypes";

// In-memory job record store — same globalThis-anchored pattern as every
// other store in this codebase. Execution is synchronous today; this
// only exists so a future async pipeline has a place to read/write
// status without redesigning the ingestion path.
class KnowledgeJobStoreImpl {
  private jobs: KnowledgeJob[] = [];

  create(job: KnowledgeJob): void {
    this.jobs.push(job);
  }

  update(id: string, patch: Partial<KnowledgeJob>): void {
    const index = this.jobs.findIndex((job) => job.id === id);
    if (index >= 0) {
      this.jobs[index] = { ...this.jobs[index], ...patch };
    }
  }

  get(id: string): KnowledgeJob | undefined {
    return this.jobs.find((job) => job.id === id);
  }

  getAll(companyId?: string): KnowledgeJob[] {
    return companyId ? this.jobs.filter((job) => job.companyId === companyId) : [...this.jobs];
  }
}

const GLOBAL_KEY = Symbol.for("ainex.KnowledgeJobStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: KnowledgeJobStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const KnowledgeJobStore: KnowledgeJobStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new KnowledgeJobStoreImpl());
