import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { createRng } from "@/lib/enterprise/seededRandom";
import type { DealStage, SalesDeal } from "@/lib/sales/SalesDealTypes";

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

// A spread across the pipeline so the demo always has something to show
// at every stage (a fresh follow-up, one mid-pipeline, one already
// awaiting approval) rather than every seeded deal starting at square one.
const SEED_STAGES: DealStage[] = [
  "follow-up-needed",
  "follow-up-needed",
  "customer-analyzed",
  "meeting-completed",
  "pending-manager-approval",
];

// Deterministic per company (seeded off the same company.profile.id every
// other per-company derivation in this app keys off), not off the
// original generateCompany() rng — this file is called lazily by
// SalesDealStore.listFor(), not from generateCompany() itself, so deals
// stay entirely SalesDealStore's concern (see SalesDealStore.ts comment).
export function buildInitialDeals(company: GeneratedCompany): SalesDeal[] {
  const rng = createRng(`${company.profile.id}::deals`);
  const salesUsers = company.enterpriseUsers.filter(
    (user) => user.departmentWorkerId === "sales" && user.assignedCustomerIds.length > 0,
  );
  if (salesUsers.length === 0) return [];

  const deals: SalesDeal[] = [];
  const usedCustomerIds = new Set<string>();
  let counter = 0;

  for (const stage of SEED_STAGES) {
    const owner = rng.pick(salesUsers);
    const availableCustomerIds = owner.assignedCustomerIds.filter((id) => !usedCustomerIds.has(id));
    if (availableCustomerIds.length === 0) continue;

    const customerId = rng.pick(availableCustomerIds);
    const customer = company.customers.find((c) => c.id === customerId);
    if (!customer) continue;
    usedCustomerIds.add(customerId);

    counter += 1;
    const at = daysAgo(rng.range(0, 10));
    deals.push({
      id: `deal-${counter}`,
      customerId,
      ownerUserId: owner.id,
      stage,
      estimatedValue: Math.round(customer.lifetimeValue * rng.rangeFloat(0.05, 0.25, 2)),
      lastInteraction: at,
      history: [{ stage, at, note: "Deal created." }],
      aiResults: {},
    });
  }

  return deals;
}
