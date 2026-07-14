import { scorePriority } from "@/lib/enterprise/DecisionEngine";
import { getAtRiskCustomers } from "@/lib/enterprise/CompanyGenerator";
import type { PriorityLevel } from "@/lib/enterprise/BusinessInsights";
import type { Customer, GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";

export interface PriorityCustomerRow {
  customer: Customer;
  priority: PriorityLevel;
  followUpReason: string;
  aiRecommendation: string;
  estimatedOpportunity: number;
  lastInteraction: string;
  suggestedAction: string;
  // Set once a rep has run Start Work for this customer — see
  // SalesDealService.startWork(). Most rows never get one.
  dealId?: string;
}

const PRIORITY_RANK: Record<PriorityLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const TOP_N = 10;

function daysSince(dateIso: string): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
}

// A short, distinct sentence from the terse suggestedAction button label
// — rule-based today (DecisionEngine.ts), not a live LLM call. The field
// is named aiRecommendation because it's the seam a future AI-backed
// version replaces, not a claim that a model generated this text today.
function buildRecommendation(customer: Customer, isAtRisk: boolean, daysSinceOrder: number): string {
  if (isAtRisk) {
    return `${customer.name} has gone quiet and is flagged at risk — a personal outreach in the next few days meaningfully improves retention odds.`;
  }
  if (daysSinceOrder > 60) {
    return `No order from ${customer.name} in ${daysSinceOrder} days — a check-in now keeps this account from drifting further.`;
  }
  if (customer.status === "New") {
    return `${customer.name} is a new account — an early relationship-building touch increases long-term retention.`;
  }
  return `${customer.name}'s account is healthy — routine engagement is enough for now.`;
}

interface ScoredRow {
  row: PriorityCustomerRow;
  score: number;
}

// The Sales Worker's daily work queue, and the one call every page uses
// — naming it as the engine's single entry point lets a future
// daily-recompute, rollover, escalation, or AI-assisted-ranking
// implementation slot in behind this same signature without callers
// changing. Still a pure function today: no scheduler, no persistence,
// no caching added in this pass.
export function getTodaysPriorities(company: GeneratedCompany, currentUser: EnterpriseUser): PriorityCustomerRow[] {
  const isSalesUser = currentUser.departmentWorkerId === "sales" && currentUser.assignedCustomerIds.length > 0;
  const scopedCustomers = isSalesUser
    ? company.customers.filter((customer) => currentUser.assignedCustomerIds.includes(customer.id))
    : company.customers;
  const atRiskIds = new Set(getAtRiskCustomers(company).map((customer) => customer.id));

  const scored: ScoredRow[] = scopedCustomers.map((customer) => {
    const orders = company.salesOrders
      .filter((order) => order.customerId === customer.id)
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
    const lastOrder = orders[0];
    const daysSinceOrder = lastOrder ? daysSince(lastOrder.orderDate) : 999;
    const isAtRisk = atRiskIds.has(customer.id);

    let priority: PriorityLevel;
    let followUpReason: string;
    if (isAtRisk) {
      priority = "Critical";
      followUpReason = "Account flagged at risk of churn.";
    } else if (daysSinceOrder > 60) {
      priority = "High";
      followUpReason = `No order in ${daysSinceOrder} days.`;
    } else if (customer.status === "New") {
      priority = "Medium";
      followUpReason = "New account — build the relationship.";
    } else {
      priority = "Low";
      followUpReason = "Account is active and healthy.";
    }

    const estimatedOpportunity = Math.round(customer.lifetimeValue * 0.15);
    const score = scorePriority({ value: estimatedOpportunity, urgencyDays: daysSinceOrder, customerStatus: customer.status });

    const row: PriorityCustomerRow = {
      customer,
      priority,
      followUpReason,
      aiRecommendation: buildRecommendation(customer, isAtRisk, daysSinceOrder),
      estimatedOpportunity,
      lastInteraction: lastOrder?.orderDate ?? "No orders on record",
      suggestedAction: isAtRisk
        ? "Schedule a retention call."
        : daysSinceOrder > 60
          ? "Reach out for a check-in."
          : "Continue routine engagement.",
      dealId: SalesDealStore.getForCustomer(company, customer.id)?.id,
    };

    return { row, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || PRIORITY_RANK[a.row.priority] - PRIORITY_RANK[b.row.priority])
    .slice(0, TOP_N)
    .map((entry) => entry.row);
}
