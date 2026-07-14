import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import type { DealAiResult, DealStage, DealTouchpointId, SalesDeal } from "@/lib/sales/SalesDealTypes";

// Business rules for SalesDeal — everything SalesDealRepository
// deliberately excludes (stage-transition rules, note composition,
// initial-deal shaping). app/workforce/dealActions.ts's Server Actions
// call this, never SalesDealStore directly, for anything beyond a plain
// read. "Repositories own persistence, services own business rules" —
// see docs/architecture/live-company-engine.md.
//
// Every method resolves the active company via CompanyProfileStore
// itself rather than taking it as a parameter: advanceDeal() is called
// from inside lib/approvals/StageDecisionAction.ts's fixed
// `(id, nextStage, note) => void` callback signature, which that
// framework (deliberately untouched by this pass) has no company slot
// for — so every method here uses the same resolve-when-needed
// convention for consistency, matching how the rest of this app already
// calls CompanyProfileStore.getCurrent() wherever it's needed rather than
// threading it through call chains.
export const SalesDealService = {
  // Priority Customer -> Follow-Up Activity: the one runtime-created-deal
  // path in the app — every other deal is pre-seeded (SalesDealGenerator.ts).
  // Idempotent per customer: a second "Start Work" click returns the
  // existing deal rather than creating a duplicate.
  startWork(customerId: string, ownerUserId: string): SalesDeal {
    const { company } = CompanyProfileStore.getCurrent();
    const existing = SalesDealStore.getForCustomer(company, customerId);
    if (existing) return existing;

    const customer = company.customers.find((entry) => entry.id === customerId);
    const at = new Date().toISOString().slice(0, 10);
    const deal: SalesDeal = {
      id: `deal-${crypto.randomUUID()}`,
      customerId,
      ownerUserId,
      stage: "follow-up-needed",
      estimatedValue: customer ? Math.round(customer.lifetimeValue * 0.15) : 0,
      lastInteraction: at,
      history: [{ stage: "follow-up-needed", at, note: "Work started from Today's Priorities." }],
      aiResults: {},
    };
    SalesDealStore.save(company, deal);
    return deal;
  },

  advanceDeal(id: string, nextStage: DealStage, note: string): void {
    const { company } = CompanyProfileStore.getCurrent();
    const deal = SalesDealStore.get(id);
    if (!deal) return;

    const at = new Date().toISOString().slice(0, 10);
    const updated: SalesDeal = {
      ...deal,
      stage: nextStage,
      lastInteraction: at,
      history: [...deal.history, { stage: nextStage, at, note }],
    };
    SalesDealStore.save(company, updated);
  },

  recordAiResult(id: string, touchpointId: DealTouchpointId, result: DealAiResult): void {
    const { company } = CompanyProfileStore.getCurrent();
    const deal = SalesDealStore.get(id);
    if (!deal) return;

    const updated: SalesDeal = { ...deal, aiResults: { ...deal.aiResults, [touchpointId]: result } };
    SalesDealStore.save(company, updated);
  },
};
