import {
  findProductName,
  formatCurrency,
  getActiveCampaigns,
  getAtRiskCustomers,
  getLowStockInventory,
  getOpenSupportTickets,
  getOutstandingInvoices,
  getOverdueInvoices,
  sumInvoiceAmounts,
} from "@/lib/enterprise/CompanyGenerator";
import type { BusinessEvent, GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { INDUSTRY_TEMPLATES } from "@/lib/enterprise/IndustryTemplates";
import { createRng } from "@/lib/enterprise/seededRandom";
import { getRoleTitle } from "@/lib/enterprise/WorkerContentBuilder";
import { WorkflowService } from "@/lib/workflow/WorkflowService";

// Not every industry sells physical, stockable goods (a law firm doesn't
// "reorder" a Legal Advisory Retainer) — IndustryTemplate.tracksInventory
// gates whether Inventory Worker language talks about stock/reorder or
// service capacity/utilization instead. A real bug found during the demo
// read-through verification step: Construction's brief originally read
// "reorder recommended" for a "Facility Maintenance Contract."
export function tracksInventory(company: GeneratedCompany): boolean {
  return INDUSTRY_TEMPLATES[company.profile.industry].tracksInventory;
}

export interface KpiValue {
  title: string;
  value: string;
  trend?: { value: number; direction: "up" | "down" | "flat" };
}

export interface ActivityItem {
  time: string;
  text: string;
}

export interface WorkforceActivityEntry extends ActivityItem {
  workerId: string;
  workerName: string;
}

export interface CollaborationStep {
  workerId: string;
  workerName: string;
  roleTitle: string;
  time: string;
  message: string;
}

const WORKER_NAMES: Record<string, string> = {
  executive: "Executive Worker",
  sales: "Sales Worker",
  finance: "Finance Worker",
  inventory: "Inventory Worker",
  hr: "HR Worker",
  "customer-support": "Customer Support Worker",
  operations: "Operations Worker",
  marketing: "Marketing Worker",
  procurement: "Procurement Worker",
  compliance: "Compliance Worker",
};

function trendDirection(pct: number): "up" | "down" | "flat" {
  if (pct > 0.5) return "up";
  if (pct < -0.5) return "down";
  return "flat";
}

export function buildExecutiveKpis(company: GeneratedCompany): KpiValue[] {
  const { financials, profile } = company;
  const overdue = getOverdueInvoices(company);
  // A rough net-income trend derived from the same revenue/expense trends
  // already shown elsewhere, not an independently invented number — this
  // keeps every KPI card's trend traceable to the two inputs a Director
  // could ask about directly.
  const netIncomeTrendPct = Math.round((financials.revenueTrendPct - financials.expenseTrendPct) * 10) / 10;
  // A freshly empty Live Company has real zeros, not "$0" worth reporting —
  // this distinguishes "no financial activity yet" from a demo company that
  // legitimately has zero revenue this quarter (which doesn't happen today,
  // but the distinction matters going forward).
  const hasFinancialData = financials.revenue > 0 || company.salesOrders.length > 0;

  return [
    {
      title: "Quarterly Revenue",
      value: hasFinancialData ? formatCurrency(financials.revenue, profile.currency) : "No data yet",
      ...(hasFinancialData
        ? { trend: { value: financials.revenueTrendPct, direction: trendDirection(financials.revenueTrendPct) } }
        : {}),
    },
    {
      title: "Net Income",
      value: hasFinancialData ? formatCurrency(financials.netIncome, profile.currency) : "No data yet",
      ...(hasFinancialData ? { trend: { value: netIncomeTrendPct, direction: trendDirection(netIncomeTrendPct) } } : {}),
    },
    {
      title: "Cash on Hand",
      value: hasFinancialData ? formatCurrency(financials.cashOnHand, profile.currency) : "No data yet",
    },
    {
      // No trend badge here — KpiCard's trend indicator always renders as
      // a percentage, and a raw invoice count isn't one. The Executive
      // Brief above already states the total amount at risk in words.
      title: "Overdue Invoices",
      value: `${overdue.length}`,
    },
  ];
}

export function buildExecutiveBrief(company: GeneratedCompany): string[] {
  const { profile, financials } = company;
  const overdue = getOverdueInvoices(company);
  const lowStock = getLowStockInventory(company);
  const atRisk = getAtRiskCustomers(company);
  const brief: string[] = [];

  brief.push(
    financials.revenueTrendPct >= 0
      ? `Revenue is up ${financials.revenueTrendPct}% this quarter to ${formatCurrency(financials.revenue, profile.currency)}.`
      : `Revenue is down ${Math.abs(financials.revenueTrendPct)}% this quarter to ${formatCurrency(financials.revenue, profile.currency)}.`,
  );

  if (overdue.length > 0) {
    brief.push(`Finance flagged ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${formatCurrency(sumInvoiceAmounts(overdue), profile.currency)} — collection action recommended today.`);
  }

  if (lowStock.length > 0) {
    const sample = findProductName(company, lowStock[0].productId);
    brief.push(
      tracksInventory(company)
        ? `Inventory flagged ${lowStock.length} SKU${lowStock.length === 1 ? "" : "s"} below reorder point, including ${sample} — reorder recommended.`
        : `Operations flagged ${lowStock.length} service line${lowStock.length === 1 ? "" : "s"} nearing capacity, including ${sample} — capacity review recommended.`,
    );
  }

  if (atRisk.length > 0) {
    brief.push(`Sales identified ${atRisk.length} account${atRisk.length === 1 ? "" : "s"} at risk of churn — follow-up in progress.`);
  }

  brief.push(`Recommendation: review today's Pending Approvals before end of day to keep the Workflow Layer moving.`);

  return brief;
}

export function buildRiskAndOpportunityEvents(company: GeneratedCompany): { risks: BusinessEvent[]; opportunities: BusinessEvent[] } {
  return {
    risks: company.events.filter((event) => event.category === "Risk").slice(0, 4),
    opportunities: company.events.filter((event) => event.category === "Opportunity").slice(0, 4),
  };
}

export function buildUpcomingEvents(company: GeneratedCompany): BusinessEvent[] {
  return company.events.filter((event) => event.category === "Milestone" || event.category === "Operational").slice(0, 5);
}

function timeSlots(rng: ReturnType<typeof createRng>, count: number): string[] {
  const hours = [7, 8, 8, 9, 9, 10, 10, 11];
  const slots: string[] = [];
  let previousTotal = -1;
  for (let i = 0; i < count; i += 1) {
    const hour = hours[Math.min(i, hours.length - 1)];
    const minute = rng.range(0, 59);
    let total = hour * 60 + minute;
    if (total <= previousTotal) {
      total = Math.min(previousTotal + rng.range(3, 12), 11 * 60 + 59);
    }
    previousTotal = total;
    const displayHour = Math.floor(total / 60);
    const displayMinute = total % 60;
    slots.push(`${displayHour}:${displayMinute.toString().padStart(2, "0")} AM`);
  }
  return slots;
}

// Outcome-first, timestamped, grounded in the real generated entities —
// this is the concrete "the workforce is already working" surface (see
// the North Star). Deterministic per company + workerId so the same
// company always shows the same activity, but reads as "this morning"
// whenever it's actually viewed.
export function buildTodaysActivity(workerId: string, company: GeneratedCompany): ActivityItem[] {
  const rng = createRng(`${company.profile.id}::activity::${workerId}`);
  const { currency } = company.profile;
  const items: string[] = [];

  switch (workerId) {
    case "executive": {
      items.push(`Compiled the daily executive brief from Sales, Finance, and Inventory signals.`);
      items.push(`Reviewed company-wide KPIs — revenue trending ${company.financials.revenueTrendPct >= 0 ? "up" : "down"} ${Math.abs(company.financials.revenueTrendPct)}% this quarter.`);
      items.push(`Flagged ${getOverdueInvoices(company).length} open financial risk item${getOverdueInvoices(company).length === 1 ? "" : "s"} for leadership review.`);
      break;
    }
    case "sales": {
      const atRisk = getAtRiskCustomers(company);
      items.push(`Reviewed ${company.salesOrders.length} open sales orders across ${company.customers.length} accounts.`);
      if (atRisk.length > 0) items.push(`Flagged ${atRisk.length} account${atRisk.length === 1 ? "" : "s"} at risk, starting with ${atRisk[0].name} — follow-up sent.`);
      items.push(`Updated CRM stage notes for today's active opportunities.`);
      break;
    }
    case "finance": {
      const overdue = getOverdueInvoices(company);
      const outstanding = getOutstandingInvoices(company);
      items.push(`Reviewed ${company.invoices.length} invoices across the receivables ledger.`);
      if (overdue.length > 0) items.push(`Flagged ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${formatCurrency(sumInvoiceAmounts(overdue), currency)} and sent payment reminders.`);
      items.push(`Outstanding receivables now stand at ${formatCurrency(sumInvoiceAmounts(outstanding), currency)}.`);
      break;
    }
    case "inventory": {
      const lowStock = getLowStockInventory(company);
      const goodsBased = tracksInventory(company);
      const facilityWord = goodsBased ? "warehouse" : "location";
      items.push(`Checked ${goodsBased ? "stock levels" : "capacity"} across ${company.warehouses.length} ${facilityWord}${company.warehouses.length === 1 ? "" : "s"}.`);
      if (lowStock.length > 0) {
        const productName = findProductName(company, lowStock[0].productId);
        items.push(
          goodsBased
            ? `Flagged ${lowStock.length} SKU${lowStock.length === 1 ? "" : "s"} below reorder point, including ${productName}, and prepared a reorder request.`
            : `Flagged ${lowStock.length} service line${lowStock.length === 1 ? "" : "s"} nearing capacity, including ${productName}, and requested a capacity review.`,
        );
      } else {
        items.push(goodsBased ? `All monitored SKUs are within healthy stock range.` : `All monitored service lines are within healthy capacity range.`);
      }
      break;
    }
    case "hr": {
      items.push(`Tracked onboarding progress across the current new-hire cohort.`);
      items.push(`Monitored leave requests for ${company.profile.employeeCount.toLocaleString()} employees company-wide.`);
      break;
    }
    case "customer-support": {
      const open = getOpenSupportTickets(company);
      const resolvedToday = rng.range(2, Math.max(3, Math.floor(company.supportTickets.length / 3)));
      items.push(`Resolved ${resolvedToday} support ticket${resolvedToday === 1 ? "" : "s"} this morning.`);
      if (open.length > 0) items.push(`${open.length} ticket${open.length === 1 ? "" : "s"} remain open; the highest priority has been escalated to a human agent.`);
      break;
    }
    case "operations": {
      const operational = company.events.filter((event) => event.category === "Operational")[0];
      items.push(`Monitored production and process schedules across ${company.warehouses.length} site${company.warehouses.length === 1 ? "" : "s"}.`);
      if (operational) items.push(operational.title + ".");
      break;
    }
    case "marketing": {
      const active = getActiveCampaigns(company);
      items.push(`Reviewed performance across ${company.campaigns.length} campaign${company.campaigns.length === 1 ? "" : "s"}, ${active.length} currently active.`);
      if (active.length > 0) items.push(`Top performer: "${active[0].name}" at ${active[0].conversionRate}% conversion.`);
      break;
    }
    case "procurement": {
      items.push(`Reviewed ${company.purchaseOrders.length} purchase orders across ${company.suppliers.length} supplier${company.suppliers.length === 1 ? "" : "s"}.`);
      const underReview = company.suppliers.filter((s) => s.status === "Under Review");
      if (underReview.length > 0) items.push(`Flagged ${underReview.length} supplier${underReview.length === 1 ? "" : "s"} under review for renewal risk.`);
      break;
    }
    case "compliance": {
      items.push(`Reviewed policy adherence against this quarter's regulatory checklist.`);
      items.push(`No unresolved compliance gaps flagged as of this morning.`);
      break;
    }
    default:
      break;
  }

  const times = timeSlots(rng, items.length);
  return items.map((text, index) => ({ time: times[index], text }));
}

// "7:33 AM" -> 453 (minutes since midnight) — the only thing needed to
// merge every worker's own activity list into one real chronological
// timeline instead of a "first thing each worker did" list.
function minutesSinceMidnight(time: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return 0;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}

// The Live Digital Workforce Activity Center's data source: every
// activity item from every worker today, merged into one chronological
// feed — not just the first item per worker. Deterministic per company
// (same seed as buildTodaysActivity), so it "updates whenever a new
// company is generated" by construction, with no separate mechanism.
export function buildWorkforceActivityFeed(company: GeneratedCompany, limit?: number): WorkforceActivityEntry[] {
  const entries: WorkforceActivityEntry[] = [];

  for (const [workerId, workerName] of Object.entries(WORKER_NAMES)) {
    for (const activity of buildTodaysActivity(workerId, company)) {
      entries.push({ workerId, workerName, ...activity });
    }
  }

  entries.sort((a, b) => minutesSinceMidnight(a.time) - minutesSinceMidnight(b.time));
  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}

// The concrete, visible cross-department story the North Star requires:
// Executive kicks it off, Sales/Inventory/Finance investigate in turn, a
// real recommended workflow (WorkflowService — the same Workflow Layer
// the rest of the app uses, not a fabricated one) carries the action
// through, and Executive closes the loop with a recommendation — all
// grounded in the same generated entities as everything else, not an
// implied side effect of the architecture.
export function buildCollaborationChain(company: GeneratedCompany): CollaborationStep[] {
  // A Live Company with no customers/products yet has nothing to build this
  // story around — every other Dashboard section already renders its own
  // "nothing yet" state; this one does the same instead of crashing on an
  // rng.pick() over an empty array.
  if (company.customers.length === 0 || company.products.length === 0) return [];

  const rng = createRng(`${company.profile.id}::collaboration`);
  const atRiskCustomers = getAtRiskCustomers(company);
  const customer = atRiskCustomers[0] ?? rng.pick(company.customers);
  const lowStock = getLowStockInventory(company);
  const product = lowStock.length > 0 ? { name: findProductName(company, lowStock[0].productId), status: lowStock[0].status } : { name: rng.pick(company.products).name, status: "Healthy" as const };
  const overdue = getOverdueInvoices(company).find((invoice) => invoice.customerId === customer.id) ?? getOverdueInvoices(company)[0];
  const goodsBased = tracksInventory(company);

  const times = timeSlots(rng, 6);

  const relevantWorkflow = overdue
    ? WorkflowService.recommendedForWorker("finance")[0]
    : lowStock.length > 0
      ? WorkflowService.recommendedForWorker("inventory")[0]
      : WorkflowService.recommendedForWorker("executive")[0];

  const recommendation = overdue
    ? "hold new credit and prioritize collection"
    : goodsBased && product.status !== "Healthy"
      ? "approve the reorder and re-engage the account"
      : "monitor and re-engage next week";

  return [
    {
      workerId: "executive",
      workerName: "Executive Worker",
      roleTitle: getRoleTitle("executive"),
      time: times[0],
      message: `Opened this morning's review by asking Sales to check on ${customer.name}, ${customer.status === "At Risk" ? "a flagged account" : "an account that's gone quiet"}.`,
    },
    {
      workerId: "sales",
      workerName: "Sales Worker",
      roleTitle: getRoleTitle("sales"),
      time: times[1],
      message: `Confirmed ${customer.name} as ${customer.status === "At Risk" ? "at risk" : "worth a check-in"} — no recent order activity — and escalated to Inventory to confirm ${goodsBased ? "stock readiness" : "capacity"} on ${product.name}.`,
    },
    {
      workerId: "inventory",
      workerName: "Inventory Worker",
      roleTitle: getRoleTitle("inventory"),
      time: times[2],
      message: `Checked ${product.name} — status is ${product.status.toLowerCase()}${product.status !== "Healthy" ? `; ${goodsBased ? "reorder" : "capacity review"} already in progress` : ""} — and passed the account context to Finance to check payment standing.`,
    },
    {
      workerId: "finance",
      workerName: "Finance Worker",
      roleTitle: getRoleTitle("finance"),
      time: times[3],
      message: overdue
        ? `Reviewed ${customer.name}'s account — found an overdue invoice for ${formatCurrency(overdue.amount, company.profile.currency)} — and recommended holding new credit until resolved.`
        : `Reviewed ${customer.name}'s account — no outstanding balance — and cleared them for continued standing terms.`,
    },
    {
      workerId: "workflow",
      workerName: "Workflow Automation",
      roleTitle: "Automated Process",
      time: times[4],
      message: relevantWorkflow
        ? `Triggered "${relevantWorkflow.name}" — routed through the Workflow Layer, never n8n directly — to carry the recommendation through to completion.`
        : `No workflow matched this case — the finding was routed straight to the Executive Worker.`,
    },
    {
      workerId: "executive",
      workerName: "Executive Worker",
      roleTitle: getRoleTitle("executive"),
      time: times[5],
      message: `Synthesized the Sales, Inventory, and Finance findings on ${customer.name} into a single recommendation for leadership: ${recommendation}.`,
    },
  ];
}
