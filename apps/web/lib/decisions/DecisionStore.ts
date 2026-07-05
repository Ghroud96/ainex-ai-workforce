import { buildDecisions, type Decision, type DecisionStatus } from "@/lib/enterprise/DecisionBuilder";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";

// The Decision Center's approve/reject state — in-memory, resets on
// server restart, same demo-scoped pattern as lib/workflow/WorkflowRunStore.ts.
// Anchored to globalThis rather than a plain module-level singleton for
// the same reason as lib/enterprise/CompanyProfileStore.ts: this store is
// read from a page Server Component (app/decisions/page.tsx) and mutated
// from a "use server" actions file (app/decisions/actions.ts), and
// Next.js/Turbopack can compile those as separate module graphs in dev,
// each getting its own evaluation of a plain singleton — globalThis is
// the actual shared process object, not per-module-graph.
class DecisionStoreImpl {
  private decisionsByCompanyId = new Map<string, Decision[]>();

  // Lazily seeds a company's decisions from buildDecisions() on first
  // access, then returns the same (mutable) list on every later call —
  // so an Approve/Reject actually persists across page refreshes for as
  // long as this company stays selected.
  listFor(company: GeneratedCompany): Decision[] {
    const existing = this.decisionsByCompanyId.get(company.profile.id);
    if (existing) return existing;

    const seeded = buildDecisions(company).map((decision) => ({ ...decision, status: "Pending" as const }));
    this.decisionsByCompanyId.set(company.profile.id, seeded);
    return seeded;
  }

  approve(id: string): void {
    this.updateStatus(id, "Approved");
  }

  reject(id: string): void {
    this.updateStatus(id, "Rejected");
  }

  private updateStatus(id: string, status: DecisionStatus): void {
    for (const decisions of this.decisionsByCompanyId.values()) {
      const decision = decisions.find((entry) => entry.id === id);
      if (decision) {
        decision.status = status;
        return;
      }
    }
  }
}

const GLOBAL_KEY = Symbol.for("ainex.DecisionStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: DecisionStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const DecisionStore: DecisionStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new DecisionStoreImpl());
