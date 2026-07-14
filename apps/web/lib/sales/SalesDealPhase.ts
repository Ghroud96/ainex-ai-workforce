import type { DealStage } from "@/lib/sales/SalesDealTypes";

// Priority -> Follow-Up Activity -> Meeting/Quotation -> Opportunity is a
// presentational grouping over the existing DealStage progression, not a
// second parallel object — SalesDealTypes.ts's DealStage/STAGE_CONFIG are
// unchanged. A deal only starts existing via SalesDealService.startWork(),
// so most Priority Customers never get one — "not every Priority Customer
// becomes a Deal" is true without needing two data models to reconcile.
export type DealPhase = "Follow-Up Activity" | "Meeting" | "Quotation" | "Opportunity";

const PHASE_BY_STAGE: Record<DealStage, DealPhase> = {
  "follow-up-needed": "Follow-Up Activity",
  "customer-analyzed": "Follow-Up Activity",
  "meeting-planned": "Meeting",
  "meeting-completed": "Meeting",
  "meeting-summarized": "Meeting",
  "follow-up-drafted": "Quotation",
  "quotation-drafted": "Quotation",
  "order-drafted": "Opportunity",
  "pending-manager-approval": "Opportunity",
  "revision-requested": "Opportunity",
  "pending-finance-review": "Opportunity",
  confirmed: "Opportunity",
  rejected: "Opportunity",
};

export function getDealPhase(stage: DealStage): DealPhase {
  return PHASE_BY_STAGE[stage];
}
