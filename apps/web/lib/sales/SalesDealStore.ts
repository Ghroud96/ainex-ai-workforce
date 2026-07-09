import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { buildInitialDeals } from "@/lib/sales/SalesDealGenerator";
import type { DealAiResult, DealStage, DealTouchpointId, SalesDeal } from "@/lib/sales/SalesDealTypes";

// Mirrors lib/decisions/DecisionStore.ts exactly: an in-memory,
// per-company-id map, lazily seeded on first access and then mutated in
// place — so a regenerated company (a new company.profile.id) naturally
// gets a fresh seed without needing any explicit clear()/reset wiring
// into CompanyProfileStore, and a deal's live-mutated state (stage
// advances, recorded AI results) survives page refreshes for as long as
// this company stays selected. Anchored to globalThis for the same
// cross-module-graph reason as every other store in this app.
class SalesDealStoreImpl {
  private dealsByCompanyId = new Map<string, SalesDeal[]>();
  // Each deal's exact just-seeded state, captured once so resetDeal() can
  // restore it later without re-running the whole seeded-rng sequence
  // (which would also reshuffle every other deal).
  private initialSnapshotsByCompanyId = new Map<string, Map<string, SalesDeal>>();

  listFor(company: GeneratedCompany): SalesDeal[] {
    const existing = this.dealsByCompanyId.get(company.profile.id);
    if (existing) return existing;

    const seeded = buildInitialDeals(company);
    this.dealsByCompanyId.set(company.profile.id, seeded);

    const snapshots = new Map<string, SalesDeal>();
    for (const deal of seeded) {
      snapshots.set(deal.id, structuredClone(deal));
    }
    this.initialSnapshotsByCompanyId.set(company.profile.id, snapshots);

    return seeded;
  }

  // The stage a deal started at when first seeded — not necessarily
  // "follow-up-needed" (SEED_STAGES gives some deals a head start; see
  // SalesDealGenerator.ts). Lets a caller prefer a deal that will replay
  // the fullest possible arc after resetDeal(), without needing to know
  // anything about the seeding scheme itself.
  getInitialStage(id: string): DealStage | undefined {
    for (const snapshots of this.initialSnapshotsByCompanyId.values()) {
      const snapshot = snapshots.get(id);
      if (snapshot) return snapshot.stage;
    }
    return undefined;
  }

  // Restores one deal to exactly the state it was in when first seeded —
  // the "start a fresh demo" reset behind the Enterprise Demo Experience
  // (see lib/enterprise/EnterpriseDemoEngine.ts), so the same featured
  // opportunity replays identically for the next customer without a full
  // company regeneration losing the presenter's chosen scenario.
  resetDeal(id: string): void {
    for (const [companyId, deals] of this.dealsByCompanyId.entries()) {
      const index = deals.findIndex((deal) => deal.id === id);
      if (index === -1) continue;

      const snapshot = this.initialSnapshotsByCompanyId.get(companyId)?.get(id);
      if (snapshot) {
        deals[index] = structuredClone(snapshot);
      }
      return;
    }
  }

  private findById(id: string): SalesDeal | undefined {
    for (const deals of this.dealsByCompanyId.values()) {
      const deal = deals.find((entry) => entry.id === id);
      if (deal) return deal;
    }
    return undefined;
  }

  get(id: string): SalesDeal | undefined {
    return this.findById(id);
  }

  advance(id: string, nextStage: DealStage, note: string): void {
    const deal = this.findById(id);
    if (!deal) return;

    const at = new Date().toISOString().slice(0, 10);
    deal.stage = nextStage;
    deal.lastInteraction = at;
    deal.history.push({ stage: nextStage, at, note });
  }

  recordAiResult(id: string, touchpointId: DealTouchpointId, result: DealAiResult): void {
    const deal = this.findById(id);
    if (!deal) return;
    deal.aiResults[touchpointId] = result;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.SalesDealStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: SalesDealStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const SalesDealStore: SalesDealStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new SalesDealStoreImpl());
