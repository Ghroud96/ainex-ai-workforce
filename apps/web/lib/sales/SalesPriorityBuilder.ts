import { getAtRiskCustomers } from "@/lib/enterprise/CompanyGenerator";
import type { PriorityLevel } from "@/lib/enterprise/BusinessInsights";
import type { Customer, GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";

export interface PriorityCustomerRow {
  customer: Customer;
  priority: PriorityLevel;
  followUpReason: string;
  estimatedOpportunity: number;
  lastInteraction: string;
  suggestedAction: string;
}

const PRIORITY_RANK: Record<PriorityLevel, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function daysSince(dateIso: string): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
}

// "Who should I follow up today?" — the first thing a Sales rep should
// see every morning. Zero AI: a deterministic ranking over data the
// company generator already produces (at-risk status, order recency,
// lifetime value), scoped to the current user's own assigned accounts
// when they're a Sales-department user (same personalization already
// established for Sales Worker AI Analysis).
export function rankPriorityCustomers(company: GeneratedCompany, currentUser: EnterpriseUser): PriorityCustomerRow[] {
  const isSalesUser = currentUser.departmentWorkerId === "sales" && currentUser.assignedCustomerIds.length > 0;
  const scopedCustomers = isSalesUser
    ? company.customers.filter((customer) => currentUser.assignedCustomerIds.includes(customer.id))
    : company.customers;
  const atRiskIds = new Set(getAtRiskCustomers(company).map((customer) => customer.id));

  const rows: PriorityCustomerRow[] = scopedCustomers.map((customer) => {
    const orders = company.salesOrders
      .filter((order) => order.customerId === customer.id)
      .sort((a, b) => b.orderDate.localeCompare(a.orderDate));
    const lastOrder = orders[0];
    const daysSinceOrder = lastOrder ? daysSince(lastOrder.orderDate) : 999;
    const isAtRisk = atRiskIds.has(customer.id);

    let priority: PriorityCustomerRow["priority"];
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

    return {
      customer,
      priority,
      followUpReason,
      estimatedOpportunity: Math.round(customer.lifetimeValue * 0.15),
      lastInteraction: lastOrder?.orderDate ?? "No orders on record",
      suggestedAction: isAtRisk
        ? "Schedule a retention call."
        : daysSinceOrder > 60
          ? "Reach out for a check-in."
          : "Continue routine engagement.",
    };
  });

  return rows.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]).slice(0, 8);
}
