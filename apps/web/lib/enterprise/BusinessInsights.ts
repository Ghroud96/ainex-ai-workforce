// A pure derivation layer over already-generated data — the same
// relationship NarrativeBuilder.ts has to CompanyGenerator.ts. Nothing
// here touches CompanyGenerator.ts, the industry templates, or any
// engine; every function reads a GeneratedCompany (or a piece of one)
// that already exists and computes presentational enrichment on top —
// "why this changed," "who's responsible," "how urgent" — for content
// the generator itself deliberately doesn't produce.
import {
  formatCurrency,
  getActiveCampaigns,
  getAtRiskCustomers,
  getLowStockInventory,
  getOpenSupportTickets,
  getOverdueInvoices,
  sumInvoiceAmounts,
} from "@/lib/enterprise/CompanyGenerator";
import type { BusinessEvent, GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import type { KpiValue } from "@/lib/enterprise/NarrativeBuilder";
import { buildRiskAndOpportunityEvents, tracksInventory } from "@/lib/enterprise/NarrativeBuilder";
import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { Workflow, WorkflowRun } from "@/lib/workflow/WorkflowTypes";

export type PriorityLevel = "Critical" | "High" | "Medium" | "Low";

export interface BusinessHealthScore {
  score: number;
  label: string;
}

export interface RecommendedAction {
  text: string;
  responsibleWorkerId: string;
  responsibleWorkerName: string;
  priority: PriorityLevel;
}

export interface EnrichedBusinessEvent extends BusinessEvent {
  businessImpact: string;
  affectedDepartments: string[];
  recommendedWorkerId?: string;
  recommendedWorkerName?: string;
  suggestedWorkflowName?: string;
  priority: PriorityLevel;
}

export interface EnrichedKpi extends KpiValue {
  whyChanged: string;
  businessImpact: string;
  recommendedAction: string;
  responsibleWorkerName: string;
}

export interface EnrichedDocument {
  usageCount: number;
  businessImportance: "High" | "Medium" | "Low";
}

export interface EnrichedWorkflowRun {
  waitingFor: string;
  estimatedCompletion: string;
  businessReason: string;
  priority: PriorityLevel;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// A business-level read of numbers already generated elsewhere (revenue
// trend, overdue ratio, at-risk ratio) into one score — the same spirit
// as lib/reasoning/ConfidenceScore.ts: reusing existing numbers, not a
// new model.
export function computeBusinessHealthScore(company: GeneratedCompany): BusinessHealthScore {
  const { financials, invoices, customers } = company;
  const overdueCount = getOverdueInvoices(company).length;
  const atRiskCount = getAtRiskCustomers(company).length;

  const revenueComponent = clamp(50 + financials.revenueTrendPct * 2, 0, 100);
  const overdueRatio = invoices.length > 0 ? overdueCount / invoices.length : 0;
  const collectionsComponent = clamp(100 - overdueRatio * 200, 0, 100);
  const atRiskRatio = customers.length > 0 ? atRiskCount / customers.length : 0;
  const retentionComponent = clamp(100 - atRiskRatio * 200, 0, 100);

  const score = Math.round(revenueComponent * 0.4 + collectionsComponent * 0.3 + retentionComponent * 0.3);
  const label = score >= 80 ? "Strong" : score >= 60 ? "Stable" : score >= 40 ? "Needs Attention" : "At Risk";

  return { score, label };
}

// 3–5 concrete, prioritized actions for the Morning Executive Brief —
// derived from the same overdue/low-stock/at-risk/ticket signals
// buildExecutiveBrief already reads, just packaged with an owner and a
// priority instead of prose.
export function buildRecommendedActions(company: GeneratedCompany): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const overdue = getOverdueInvoices(company);
  const lowStock = getLowStockInventory(company);
  const atRisk = getAtRiskCustomers(company);
  const openTickets = getOpenSupportTickets(company);
  const goodsBased = tracksInventory(company);

  if (overdue.length > 0) {
    actions.push({
      text: `Collect ${formatCurrency(sumInvoiceAmounts(overdue), company.profile.currency)} in overdue invoices across ${overdue.length} account${overdue.length === 1 ? "" : "s"}.`,
      responsibleWorkerId: "finance",
      responsibleWorkerName: "Finance Worker",
      priority: overdue.length > 3 ? "Critical" : "High",
    });
  }

  if (lowStock.length > 0) {
    actions.push({
      text: goodsBased
        ? `Reorder ${lowStock.length} SKU${lowStock.length === 1 ? "" : "s"} before they run out of stock.`
        : `Review capacity on ${lowStock.length} service line${lowStock.length === 1 ? "" : "s"} nearing their limit.`,
      responsibleWorkerId: "inventory",
      responsibleWorkerName: "Inventory Worker",
      priority: "High",
    });
  }

  if (atRisk.length > 0) {
    actions.push({
      text: `Re-engage ${atRisk.length} at-risk account${atRisk.length === 1 ? "" : "s"} before they churn.`,
      responsibleWorkerId: "sales",
      responsibleWorkerName: "Sales Worker",
      priority: "Medium",
    });
  }

  if (openTickets.length > 0) {
    actions.push({
      text: `Close out ${openTickets.length} open support ticket${openTickets.length === 1 ? "" : "s"}.`,
      responsibleWorkerId: "customer-support",
      responsibleWorkerName: "Customer Support Worker",
      priority: "Medium",
    });
  }

  actions.push({
    text: "Review today's Pending Approvals to keep the Workflow Layer moving.",
    responsibleWorkerId: "executive",
    responsibleWorkerName: "Executive Worker",
    priority: "Low",
  });

  return actions.slice(0, 5);
}

export const WORKER_NAMES_BY_ID: Record<string, string> = {
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

const EVENT_KEYWORD_MAP: { keywords: string[]; workerId: string; departments: string[] }[] = [
  { keywords: ["invoice", "payment", "overdue", "cash", "budget", "credit", "receivable"], workerId: "finance", departments: ["Finance"] },
  { keywords: ["stock", "reorder", "inventory", "warehouse", "sku", "capacity", "consumable"], workerId: "inventory", departments: ["Supply Chain", "Operations"] },
  { keywords: ["customer", "account", "lead", "pipeline", "churn", "order", "tender", "client"], workerId: "sales", departments: ["Sales"] },
  { keywords: ["campaign", "marketing", "conversion", "booking", "promotion"], workerId: "marketing", departments: ["Marketing"] },
  { keywords: ["supplier", "vendor", "contract", "procurement", "purchase order", "material cost"], workerId: "procurement", departments: ["Procurement"] },
  { keywords: ["ticket", "complaint", "escalat", "support"], workerId: "customer-support", departments: ["Customer Service"] },
  { keywords: ["employee", "staff", "hire", "onboard", "leave", "roster", "nurse"], workerId: "hr", departments: ["Human Resources"] },
  { keywords: ["compliance", "audit", "policy", "regulat", "accreditation"], workerId: "compliance", departments: ["Legal & Compliance"] },
  { keywords: ["production", "schedule", "process", "safety", "site", "project", "timeline"], workerId: "operations", departments: ["Operations"] },
];

function matchEventContext(event: BusinessEvent): { workerId: string; departments: string[] } | null {
  const text = `${event.title} ${event.description}`.toLowerCase();
  for (const entry of EVENT_KEYWORD_MAP) {
    if (entry.keywords.some((keyword) => text.includes(keyword))) {
      return { workerId: entry.workerId, departments: entry.departments };
    }
  }
  return null;
}

function priorityForEvent(event: BusinessEvent): PriorityLevel {
  if (event.category === "Risk") {
    const text = event.title.toLowerCase();
    if (text.includes("overdue") || text.includes("critical") || text.includes("safety") || text.includes("backlog")) {
      return "Critical";
    }
    return "High";
  }
  if (event.category === "Opportunity") return "Medium";
  return "Low";
}

function impactForEvent(event: BusinessEvent): string {
  switch (event.category) {
    case "Risk":
      return "Left unaddressed, this could affect revenue, customer trust, or delivery timelines.";
    case "Opportunity":
      return "Acting on this could grow revenue or strengthen a key account relationship.";
    case "Milestone":
      return "Reflects real progress worth highlighting to leadership.";
    case "Operational":
      return "Keeps day-to-day operations running smoothly without executive intervention.";
  }
}

// Adds Problem/Impact/Departments/Recommended Worker/Suggested
// Workflow/Priority to a generated BusinessEvent — every field derived
// from the event's own text plus the real Workflow Layer
// (WorkflowService.recommendedForWorker, already used elsewhere), never
// a new store or a change to how events are generated.
export function enrichBusinessEvent(event: BusinessEvent): EnrichedBusinessEvent {
  const match = matchEventContext(event);
  const recommendedWorkerId = match?.workerId;
  const recommendedWorkerName = recommendedWorkerId ? WORKER_NAMES_BY_ID[recommendedWorkerId] : undefined;
  const suggestedWorkflow = recommendedWorkerId ? WorkflowService.recommendedForWorker(recommendedWorkerId)[0] : undefined;

  return {
    ...event,
    businessImpact: impactForEvent(event),
    affectedDepartments: match?.departments ?? [],
    recommendedWorkerId,
    recommendedWorkerName,
    suggestedWorkflowName: suggestedWorkflow?.name,
    priority: priorityForEvent(event),
  };
}

// "Every KPI should explain itself" — why it moved, what it means for
// the business, what to do next, and who owns it. Keyed by the exact
// titles buildExecutiveKpis() produces.
export function enrichKpi(kpi: KpiValue, company: GeneratedCompany): EnrichedKpi {
  const { financials, profile } = company;
  const overdue = getOverdueInvoices(company);

  switch (kpi.title) {
    case "Quarterly Revenue":
      return {
        ...kpi,
        whyChanged: `Driven by ${company.salesOrders.length} orders across ${company.customers.length} active accounts this quarter.`,
        businessImpact:
          financials.revenueTrendPct >= 0
            ? "Growth funds hiring, inventory, and marketing investment."
            : "A slowing top line tightens budget for the coming quarter.",
        recommendedAction:
          financials.revenueTrendPct >= 0
            ? "Maintain momentum on top-performing accounts."
            : "Review pipeline coverage with the Sales Worker.",
        responsibleWorkerName: "Sales Worker",
      };
    case "Net Income":
      return {
        ...kpi,
        whyChanged: `Expenses moved ${financials.expenseTrendPct >= 0 ? "up" : "down"} ${Math.abs(financials.expenseTrendPct)}% against revenue growth of ${financials.revenueTrendPct}%.`,
        businessImpact: "Directly affects how much cash is available to reinvest.",
        recommendedAction: "Review cost trends with Finance before next quarter's budget.",
        responsibleWorkerName: "Finance Worker",
      };
    case "Cash on Hand":
      return {
        ...kpi,
        whyChanged: "Reflects collected revenue net of operating expenses this quarter.",
        businessImpact: "Determines runway for payroll, supplier payments, and growth investment.",
        recommendedAction: "Confirm receivables collection stays on schedule.",
        responsibleWorkerName: "Finance Worker",
      };
    case "Overdue Invoices":
      return {
        ...kpi,
        whyChanged: `${overdue.length} invoice${overdue.length === 1 ? "" : "s"} passed its due date without payment.`,
        businessImpact:
          overdue.length > 0
            ? `${formatCurrency(sumInvoiceAmounts(overdue), profile.currency)} in cash is currently delayed.`
            : "No cash is currently delayed.",
        recommendedAction: overdue.length > 0 ? "Send collection reminders today." : "No action needed.",
        responsibleWorkerName: "Finance Worker",
      };
    default:
      return { ...kpi, whyChanged: "", businessImpact: "", recommendedAction: "", responsibleWorkerName: "Executive Worker" };
  }
}

const HIGH_IMPORTANCE_CATEGORIES = new Set(["Finance", "Legal", "Policies", "Contracts"]);

// "Usage Count" and "Business Importance" for a Knowledge Hub document —
// both derived from fields the document already carries (usedBy,
// workflows, category), not new generator output.
export function enrichDocument(doc: { usedBy: string[]; workflows: string[]; category: string }): EnrichedDocument {
  const usageCount = doc.usedBy.length + doc.workflows.length;
  const businessImportance =
    HIGH_IMPORTANCE_CATEGORIES.has(doc.category) || usageCount >= 3 ? "High" : usageCount >= 1 ? "Medium" : "Low";

  return { usageCount, businessImportance };
}

function relativeTimeFromNow(iso: string): string {
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.round(diffHours / 24)}d ago`;
}

// "Waiting For"/"Estimated Completion"/"Business Reason"/"Priority" for
// a workflow run — derived from the run's own status/timestamps and its
// parent Workflow's description/requiresApproval, not new WorkflowRun
// fields.
export function enrichWorkflowRun(run: WorkflowRun, workflow?: Workflow): EnrichedWorkflowRun {
  const waitingFor =
    run.status === "Requires Approval"
      ? "Manager approval"
      : run.status === "Running"
        ? "Step completion"
        : run.status === "Failed"
          ? "Retry or manual intervention"
          : "Nothing — complete";

  const estimatedCompletion =
    run.status === "Requires Approval" || run.status === "Running"
      ? "Within 1 business day of approval"
      : run.status === "Failed"
        ? run.completedAt
          ? `Failed ${relativeTimeFromNow(run.completedAt)} — unresolved`
          : "Unresolved"
        : run.completedAt
          ? relativeTimeFromNow(run.completedAt)
          : "—";

  return {
    waitingFor,
    estimatedCompletion,
    businessReason: workflow?.description ?? "Business reason unavailable.",
    priority: workflow?.requiresApproval ? "High" : "Medium",
  };
}

// Priority for a Workflow Library entry itself (not a run) — derived
// from fields Workflow already carries.
export function priorityForWorkflow(workflow: Workflow): PriorityLevel {
  if (workflow.requiresApproval) return "High";
  if (workflow.trigger.type === "Event Based") return "Medium";
  return "Low";
}

export interface CompanyStory {
  situation: string;
  challenges: string[];
  opportunities: string[];
}

// "Business Storytelling" — every generated company should read as a
// believable enterprise, not just a name and a tagline. No new fields on
// GeneratedCompanyProfile: situation/challenges/opportunities are prose
// derived entirely from data the generator already produces (financials,
// overdue invoices, at-risk customers, low stock, campaigns, risk/
// opportunity events) — the same relationship enrichKpi's "why changed"
// already has to a raw KPI number.
export function buildCompanyStory(company: GeneratedCompany): CompanyStory {
  const { profile, financials } = company;
  const overdue = getOverdueInvoices(company);
  const atRisk = getAtRiskCustomers(company);
  const lowStock = getLowStockInventory(company);
  const openTickets = getOpenSupportTickets(company);
  const activeCampaigns = getActiveCampaigns(company);
  const goodsBased = tracksInventory(company);
  const { risks, opportunities: opportunityEvents } = buildRiskAndOpportunityEvents(company);

  const situation = `${profile.name} is a ${profile.size.toLowerCase()} ${profile.industry.toLowerCase()} business with ${profile.employeeCount.toLocaleString()} employees, generating ${formatCurrency(financials.revenue, profile.currency)} this quarter — revenue is ${financials.revenueTrendPct >= 0 ? "growing" : "under pressure"}, ${Math.abs(financials.revenueTrendPct)}% ${financials.revenueTrendPct >= 0 ? "ahead of" : "behind"} last quarter.`;

  const challenges: string[] = [];
  if (overdue.length > 0) {
    challenges.push(`${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${formatCurrency(sumInvoiceAmounts(overdue), profile.currency)} are tying up cash that should be funding growth.`);
  }
  if (atRisk.length > 0) {
    challenges.push(`${atRisk.length} customer${atRisk.length === 1 ? "" : "s"}, including ${atRisk[0].name}, ${atRisk.length === 1 ? "is" : "are"} at risk of churning without a proactive check-in.`);
  }
  if (lowStock.length > 0) {
    challenges.push(goodsBased
      ? `${lowStock.length} SKU${lowStock.length === 1 ? "" : "s"} are below reorder point, risking stockouts on active orders.`
      : `${lowStock.length} service line${lowStock.length === 1 ? "" : "s"} are nearing capacity, risking delivery delays.`);
  }
  if (openTickets.length > 0) {
    challenges.push(`${openTickets.length} support ticket${openTickets.length === 1 ? "" : "s"} remain open and could affect customer trust if they linger.`);
  }
  if (risks[0]) {
    challenges.push(risks[0].title + ".");
  }
  if (challenges.length === 0) {
    challenges.push("No material challenges are flagged right now — the business is tracking cleanly.");
  }

  const opportunities: string[] = [];
  if (activeCampaigns.length > 0) {
    const best = [...activeCampaigns].sort((a, b) => b.conversionRate - a.conversionRate)[0];
    opportunities.push(`"${best.name}" is converting at ${best.conversionRate}% — a strong candidate for additional budget.`);
  }
  if (opportunityEvents[0]) {
    opportunities.push(opportunityEvents[0].title + ".");
  }
  if (financials.revenueTrendPct >= 0) {
    opportunities.push(`Revenue growth of ${financials.revenueTrendPct}% this quarter creates room to reinvest in the highest-performing accounts.`);
  }
  if (opportunities.length === 0) {
    opportunities.push("No standout growth opportunity is flagged this quarter — focus is on stabilizing the fundamentals above.");
  }

  return { situation, challenges, opportunities };
}
