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
// awaiting approval, one fully confirmed) rather than every seeded deal
// starting at square one. The "confirmed" entry exists specifically so
// Company Timeline (lib/enterprise/CompanyTimeline.ts) and Recent
// Activity have a real, complete history to show on first load — a
// deliberate, called-out deviation from a prior phase's "no changes to
// SalesDealGenerator.ts" non-goal (see
// docs/architecture/live-company-engine.md).
const SEED_STAGES: DealStage[] = [
  "follow-up-needed",
  "follow-up-needed",
  "customer-analyzed",
  "meeting-completed",
  "pending-manager-approval",
  "confirmed",
];

// Hand-authored, not derived — the one deal in this pass with a full,
// realistic multi-step trail (contact through Finance approval), so the
// "one completed opportunity showing history and audit records"
// requirement has real data behind it immediately, without simulating
// every touchpoint's AI call at generation time.
function confirmedDealHistory(): SalesDeal["history"] {
  return [
    { stage: "follow-up-needed", at: daysAgo(21), note: "Deal created." },
    { stage: "customer-analyzed", at: daysAgo(19), note: "Mark Customer Analyzed" },
    { stage: "meeting-planned", at: daysAgo(17), note: "Mark Meeting Planned" },
    { stage: "meeting-completed", at: daysAgo(14), note: "Mark Meeting Completed" },
    { stage: "meeting-summarized", at: daysAgo(13), note: "Mark Meeting Summarized" },
    { stage: "follow-up-drafted", at: daysAgo(11), note: "Mark Follow-up Drafted" },
    { stage: "quotation-drafted", at: daysAgo(9), note: "Mark Quotation Drafted" },
    { stage: "order-drafted", at: daysAgo(7), note: "Submit for Approval" },
    { stage: "pending-manager-approval", at: daysAgo(7), note: "Submitted for approval." },
    { stage: "pending-finance-review", at: daysAgo(5), note: "Manager approved by Zainab Kaur." },
    { stage: "confirmed", at: daysAgo(3), note: "Finance approved by Deepa Foo." },
  ];
}

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
    const isConfirmed = stage === "confirmed";
    const at = isConfirmed ? daysAgo(3) : daysAgo(rng.range(0, 10));
    deals.push({
      id: `deal-${counter}`,
      customerId,
      ownerUserId: owner.id,
      stage,
      estimatedValue: Math.round(customer.lifetimeValue * rng.rangeFloat(0.05, 0.25, 2)),
      lastInteraction: at,
      history: isConfirmed ? confirmedDealHistory() : [{ stage, at, note: "Deal created." }],
      aiResults: {},
    });
  }

  return deals;
}
