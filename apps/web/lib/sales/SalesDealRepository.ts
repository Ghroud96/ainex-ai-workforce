import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import type { DealStage, SalesDeal } from "@/lib/sales/SalesDealTypes";

// Persistence only — load, save, update, query. Deliberately excludes
// stage-transition rules, note composition, and initial-deal shaping
// (see lib/sales/SalesDealService.ts for those): "Repositories own
// persistence, services own business rules" is the governing principle
// for this pass (docs/architecture/live-company-engine.md). A future
// FirestoreSalesDealRepository implements this same interface — nothing
// above it (dealActions.ts, SalesDealService.ts) changes when that
// happens.
export interface SalesDealRepository {
  listFor(company: GeneratedCompany): SalesDeal[];
  get(id: string): SalesDeal | undefined;
  getForCustomer(company: GeneratedCompany, customerId: string): SalesDeal | undefined;
  getInitialStage(id: string): DealStage | undefined;
  // Upsert — creates the deal if its id isn't already stored for this
  // company, otherwise replaces it in place.
  save(company: GeneratedCompany, deal: SalesDeal): void;
  // Restores a deal to exactly its just-seeded state (load + save, no
  // domain rule) — the "start a fresh demo" reset behind the Enterprise
  // Demo Experience.
  resetDeal(id: string): void;
}
