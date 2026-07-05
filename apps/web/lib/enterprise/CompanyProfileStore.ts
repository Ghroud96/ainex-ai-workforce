import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";
import { generateCompany } from "@/lib/enterprise/CompanyGenerator";
import type { CompanySize, GeneratedCompany, Industry } from "@/lib/enterprise/EnterpriseTypes";

const DEFAULT_INDUSTRY: Industry = "Retail";
const DEFAULT_SIZE: CompanySize = "Medium Enterprise";

export interface CompanySelection {
  industry: Industry;
  size: CompanySize;
  company: GeneratedCompany;
}

// The one global, in-memory "current demo company" selection — same
// pattern as lib/workflow/WorkflowRunStore.ts and the other Phase C7-C9
// stores: single-tenant, resets on server restart, no DB. A cookie-per-
// browser approach would be worse here: this is a shared-presenter demo
// tool, and everyone looking at AINEX during a POC should see the same
// company. Defaults to Retail / Medium Enterprise so the app is never
// empty on first load.
class CompanyProfileStoreImpl {
  private selection: CompanySelection;

  constructor() {
    this.selection = { industry: DEFAULT_INDUSTRY, size: DEFAULT_SIZE, company: generateCompany(DEFAULT_INDUSTRY, DEFAULT_SIZE) };
  }

  getCurrent(): CompanySelection {
    return this.selection;
  }

  // Regenerates the company and propagates it to every consumer that
  // caches content at module scope: WorkerRegistry (rebuilt via
  // WorkerRegistry.replaceAll()) and the Knowledge Pipeline's ingestion
  // cache (invalidated via resetCache()). Without both calls, a profile
  // switch would silently not reach WorkforceService, WorkerRuntime, or
  // RAG retrieval.
  //
  // WorkerRegistry/WorkerFactory are imported dynamically here, not
  // statically at the top of this file: WorkerRegistry.ts eagerly builds
  // its roster at module-load time via buildWorkforceRoster(), which
  // (through data/workers.ts) needs CompanyProfileStore to already
  // exist. A static import here would create a real circular
  // module-initialization order bug (CompanyProfileStore -> WorkerRegistry
  // -> data/workers -> CompanyProfileStore, evaluated before this file's
  // own `export const CompanyProfileStore` line runs). Deferring the
  // import to call time (long after the module graph has settled, since
  // setSelection() only ever runs from a user-triggered Server Action)
  // avoids it entirely.
  async setSelection(industry: Industry, size: CompanySize): Promise<CompanySelection> {
    const company = generateCompany(industry, size);
    this.selection = { industry, size, company };

    const [{ WorkerRegistry }, { buildWorkforceRoster }] = await Promise.all([
      import("@/lib/workforce/WorkerRegistry"),
      import("@/lib/workforce/WorkerFactory"),
    ]);
    WorkerRegistry.replaceAll(buildWorkforceRoster());
    resetCache();

    // A regenerated company means every previous Worker AI Analysis result
    // may reference a document that no longer exists — dynamically
    // imported for the same reason WorkerRegistry/WorkerFactory are above
    // (avoids a circular import at module-init time).
    const { WorkerAnalysisResultStore } = await import("@/lib/services/knowledge/WorkerAnalysisResultStore");
    WorkerAnalysisResultStore.clear();

    // Likewise, whoever was "logged in" belonged to the previous company's
    // generated user roster and almost certainly doesn't exist in the new
    // one — resolveCurrentUser() also self-heals via a fallback, but this
    // explicit clear keeps the invalidation self-documenting here, matching
    // every other store above.
    const { CurrentUserStore } = await import("@/lib/enterprise/CurrentUserStore");
    CurrentUserStore.clear();

    return this.selection;
  }
}

// Anchored to globalThis, not a plain module-level `const`: Next.js
// (particularly Turbopack in dev mode) can compile a Server Action's
// bundle (app/settings/actions.ts) and a page's Server Component bundle
// (e.g. app/dashboard/page.tsx) as separate module graphs, each getting
// its own evaluation of a file that's only cached per-module-instance —
// so a plain `export const CompanyProfileStore = new ...()` singleton
// silently ends up as *two different objects* that never see each
// other's mutations. globalThis is the actual Node.js process-wide
// object, genuinely shared across every module graph in that process —
// the same fix Next.js's own docs recommend for singleton clients (e.g.
// Prisma) that must survive across separately-bundled entry points. This
// was a real bug found during verification: switching company profile
// via the Settings form updated /settings itself but left every other
// page (Dashboard, Workforce, Knowledge, worker detail) showing the
// previous company until this fix.
const GLOBAL_KEY = Symbol.for("ainex.CompanyProfileStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: CompanyProfileStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const CompanyProfileStore: CompanyProfileStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new CompanyProfileStoreImpl());
