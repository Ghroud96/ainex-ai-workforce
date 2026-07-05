import type { PersonaId, WorkerAnalysisResult } from "@/lib/services/knowledge/WorkerAnalysisService";

// The latest AI analysis result per persona — in-memory, resets on server
// restart, same demo-scoped pattern as lib/decisions/DecisionStore.ts.
// Single slot per persona (not history), matching "one document + one
// worker per request." Anchored to globalThis for the same reason as
// lib/enterprise/CompanyProfileStore.ts: this store is written from a
// "use server" actions file (app/workforce/aiActions.ts) and read from a
// page Server Component (app/workforce/[slug]/page.tsx), which Next.js/
// Turbopack can compile as separate module graphs in dev.
class WorkerAnalysisResultStoreImpl {
  private results = new Map<PersonaId, WorkerAnalysisResult>();

  set(personaId: PersonaId, result: WorkerAnalysisResult): void {
    this.results.set(personaId, result);
  }

  get(personaId: PersonaId): WorkerAnalysisResult | undefined {
    return this.results.get(personaId);
  }

  // Called from CompanyProfileStore.setSelection() — a regenerated company
  // means every previous analysis result may reference a document that no
  // longer exists (or exists under a different id), so stale results must
  // not survive a company switch.
  clear(): void {
    this.results.clear();
  }
}

const GLOBAL_KEY = Symbol.for("ainex.WorkerAnalysisResultStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: WorkerAnalysisResultStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const WorkerAnalysisResultStore: WorkerAnalysisResultStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new WorkerAnalysisResultStoreImpl());
