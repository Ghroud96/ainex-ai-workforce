import type { DigitalDocument } from "@/data/documents";
import {
  findProductName,
  formatCurrency,
  getAtRiskCustomers,
  getLowStockInventory,
  getOverdueInvoices,
  sumInvoiceAmounts,
} from "@/lib/enterprise/CompanyGenerator";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import type { DepartmentWorkerId, EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import { getRelevantDocuments, withKnowledgeCitation } from "@/lib/company-intelligence/RelevantKnowledge";
import { KnowledgeReferenceStore } from "@/lib/company-intelligence/KnowledgeReferenceStore";
import { AiModeStore } from "@/lib/llm/AiModeStore";
import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";

export type PersonaId = "executive" | "sales" | "executive-assistant" | "finance" | "inventory" | "hr";

export interface WorkerAnalysisSection {
  key: string;
  label: string;
  value: string | string[];
}

export interface KnowledgeSourceUsed {
  id: string;
  name: string;
  source: "demo" | "customer-upload";
}

export interface WorkerAnalysisResult {
  personaId: PersonaId;
  personaLabel: string;
  sections: WorkerAnalysisSection[];
  knowledgeSourcesUsed: KnowledgeSourceUsed[];
  modelUsed: string;
  source: "Demo Mode" | "Live AI";
  generationTimeMs: number;
}

interface SectionSchemaEntry {
  key: string;
  label: string;
  type: "text" | "list";
}

interface PersonaConfig {
  workerId: DepartmentWorkerId;
  personaLabel: string;
  sectionSchema: SectionSchemaEntry[];
  systemPrompt: string;
  buildDeterministicBase: (
    document: DigitalDocument,
    company: GeneratedCompany,
    currentUser: EnterpriseUser,
    relevantDocuments: DigitalDocument[],
  ) => Record<string, string | string[]>;
}

// Appended to every persona's system prompt so a Live AI response reads as
// grounded in named company documents ("Based on your Sales SOP...")
// rather than a generic answer — the documents themselves are supplied in
// the user message content, never invented by the model.
const KNOWLEDGE_CITATION_INSTRUCTION =
  " If relevant company documents are listed in the user message, reference them naturally by name (e.g. \"Based on your Sales SOP...\", \"According to your Pricing sheet...\") — never invent a document that wasn't provided.";

function firstSentences(text: string, count: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
  return sentences.slice(0, count).join(" ").trim();
}

// Six real, concrete personas — hand-written, not config-driven, since each
// samples different company data in a genuinely different shape (Sales
// sorts customers by lifetime value, Finance reads invoices/financials,
// Inventory reads stock/suppliers, HR has no generated leave/hiring data
// to draw on and stays honestly generic). Only the AI-call skeleton below
// is shared — that's the part six real call sites actually justify reusing.

function buildExecutiveAnalysisBase(
  document: DigitalDocument,
  company: GeneratedCompany,
  _currentUser: EnterpriseUser,
  relevantDocuments: DigitalDocument[],
): Record<string, string | string[]> {
  const overdue = getOverdueInvoices(company);
  const atRisk = getAtRiskCustomers(company);

  return {
    executiveSummary: withKnowledgeCitation(relevantDocuments, firstSentences(document.description, 2) || document.description),
    businessRisks: [
      overdue.length > 0
        ? `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${formatCurrency(sumInvoiceAmounts(overdue), company.profile.currency)}.`
        : "No overdue invoices flagged at this time.",
      atRisk.length > 0
        ? `${atRisk.length} customer${atRisk.length === 1 ? "" : "s"} at risk of churn.`
        : "No customers currently flagged at risk.",
    ],
    opportunities: [`${document.name} is now indexed and available for cross-department reference.`],
    recommendedDecisions: [`Route ${document.name} to ${document.department} for formal review.`],
  };
}

// Genuinely personal — driven entirely by the current user's own assigned
// tasks/meetings/approvals, not company-wide signals. Replaces the old
// 5-field department-flavored brief entirely (Capability 04). Enterprise
// Demo V1 additionally feeds it live deal-workflow events relevant to the
// current user (a quotation awaiting their approval, a deal they own
// that's stalled) — an additive data-source change only, no new field or
// persona, so the Executive Assistant "continuously monitors workflow"
// and feels proactive rather than reactive.
function buildExecutiveAssistantAnalysisBase(
  document: DigitalDocument,
  company: GeneratedCompany,
  currentUser: EnterpriseUser,
  relevantDocuments: DigitalDocument[],
): Record<string, string | string[]> {
  const { assignedTasks, assignedMeetings, assignedApprovals } = currentUser;

  const deals = SalesDealStore.listFor(company);
  const dealNoteFor = (dealCustomerId: string) => company.customers.find((customer) => customer.id === dealCustomerId)?.name ?? "a customer";

  const isSalesManager = currentUser.departmentWorkerId === "sales" && currentUser.roleLevel !== "Staff";
  const isFinanceUser = currentUser.departmentWorkerId === "finance";
  const dealFollowUps: string[] = [];
  if (isSalesManager) {
    const pending = deals.filter((deal) => deal.stage === "pending-manager-approval");
    pending.forEach((deal) => dealFollowUps.push(`Sales order for ${dealNoteFor(deal.customerId)} requires your approval.`));
  }
  if (isFinanceUser) {
    const pending = deals.filter((deal) => deal.stage === "pending-finance-review");
    pending.forEach((deal) => dealFollowUps.push(`Approved order for ${dealNoteFor(deal.customerId)} is awaiting finance review.`));
  }
  const myStalledDeals = deals.filter((deal) => deal.ownerUserId === currentUser.id && deal.stage === "revision-requested");
  myStalledDeals.forEach((deal) => dealFollowUps.push(`Revision requested on the order for ${dealNoteFor(deal.customerId)} — resubmit when ready.`));

  return {
    todaysPriorities:
      assignedTasks.length > 0
        ? assignedTasks.slice(0, 3).map((task) => `${task.title} (${task.priority} priority, due ${task.dueDate})`)
        : [`No urgent priorities flagged for ${currentUser.name} today.`],
    upcomingMeetings:
      assignedMeetings.length > 0
        ? assignedMeetings.map((meeting) => `${meeting.title} with ${meeting.withWhom} — ${meeting.date} at ${meeting.time}`)
        : ["No meetings currently scheduled."],
    pendingTasks:
      assignedTasks.length > 0
        ? assignedTasks.map((task) => `${task.title} — due ${task.dueDate}`)
        : ["No pending tasks."],
    importantFollowUps:
      dealFollowUps.length > 0
        ? dealFollowUps
        : [`Review ${document.name} before responding to related requests.`],
    approvalReminders:
      assignedApprovals.length > 0
        ? assignedApprovals.map((approval) => `${approval.title}, requested by ${approval.requestedBy}, due ${approval.dueDate}`)
        : ["No approvals currently pending."],
    personalRecommendations: [
      withKnowledgeCitation(relevantDocuments, `Confirm ${document.category} documentation is current before your next ${document.department} sync.`),
    ],
  };
}

// Stays department-level, not user-specific in identity — but scopes
// topCustomers/inactiveCustomers/followUpPlan to the current user's own
// assigned customer subset when they're a Sales-department user, so two
// different Sales reps analyzing the same document see different accounts.
// Falls back to full company-wide behavior (unchanged from 03A) for
// non-Sales viewers (e.g. a Manager/Executive checking in on Sales).
// salesOpportunities/salesForecast stay company-wide — not among the
// fields the spec names for per-user scoping.
function buildSalesAnalysisBase(
  document: DigitalDocument,
  company: GeneratedCompany,
  currentUser: EnterpriseUser,
  relevantDocuments: DigitalDocument[],
): Record<string, string | string[]> {
  const isSalesUser = currentUser.departmentWorkerId === "sales" && currentUser.assignedCustomerIds.length > 0;
  const scopedCustomers = isSalesUser
    ? company.customers.filter((customer) => currentUser.assignedCustomerIds.includes(customer.id))
    : company.customers;

  const topCustomers = [...scopedCustomers].sort((a, b) => b.lifetimeValue - a.lifetimeValue).slice(0, 3);
  // Reimplements getAtRiskCustomers's exact "At Risk" predicate inline
  // (rather than calling it) since that helper always reads the whole
  // company.customers — there's no way to call it against a pre-filtered
  // subset without widening its signature for every other caller.
  const inactive = scopedCustomers.filter((customer) => customer.status === "At Risk");

  return {
    topCustomers: topCustomers.map((customer) => `${customer.name} (${formatCurrency(customer.lifetimeValue, company.profile.currency)} lifetime value)`),
    inactiveCustomers: inactive.length > 0 ? inactive.map((customer) => customer.name) : ["No inactive accounts flagged."],
    salesOpportunities: [`${document.name} may support a follow-up conversation with ${document.department}-linked accounts.`],
    followUpPlan: inactive.slice(0, 3).map((customer) => `Contact ${customer.name} this week.`),
    salesForecast: withKnowledgeCitation(
      relevantDocuments,
      `Revenue is trending ${company.financials.revenueTrendPct >= 0 ? "up" : "down"} ${Math.abs(company.financials.revenueTrendPct)}% this quarter.`,
    ),
  };
}

function buildFinanceAnalysisBase(
  document: DigitalDocument,
  company: GeneratedCompany,
  _currentUser: EnterpriseUser,
  relevantDocuments: DigitalDocument[],
): Record<string, string | string[]> {
  const overdue = getOverdueInvoices(company);
  const { financials, profile } = company;

  return {
    cashFlowSummary: withKnowledgeCitation(
      relevantDocuments,
      `Cash on hand stands at ${formatCurrency(financials.cashOnHand, profile.currency)}, with net income of ${formatCurrency(financials.netIncome, profile.currency)} this quarter.`,
    ),
    overdueInvoices: overdue.length > 0
      ? overdue.map((invoice) => `Invoice ${invoice.invoiceNumber} — ${formatCurrency(invoice.amount, profile.currency)}`)
      : ["No overdue invoices."],
    costConcerns: [`Expenses moved ${financials.expenseTrendPct >= 0 ? "up" : "down"} ${Math.abs(financials.expenseTrendPct)}% this quarter.`],
    financialRisks: [`${formatCurrency(financials.outstandingReceivables, profile.currency)} in receivables remains uncollected.`],
    recommendedActions: [`Cross-check ${document.name} against current receivables before closing the books.`],
  };
}

function buildInventoryAnalysisBase(
  document: DigitalDocument,
  company: GeneratedCompany,
  _currentUser: EnterpriseUser,
  relevantDocuments: DigitalDocument[],
): Record<string, string | string[]> {
  const lowStock = getLowStockInventory(company);
  const supplierRisks = company.suppliers.filter((supplier) => supplier.status === "Under Review");
  const busyWarehouses = company.warehouses.filter((warehouse) => warehouse.utilizationPct >= 85);

  return {
    lowStockItems: lowStock.length > 0
      ? lowStock.map((item) => `${findProductName(company, item.productId)} — ${item.status}`)
      : ["No items below reorder point."],
    reorderSuggestions: lowStock.length > 0
      ? lowStock.slice(0, 3).map((item) => `Reorder ${findProductName(company, item.productId)}.`)
      : ["No reorders needed at this time."],
    supplierRisks: supplierRisks.length > 0 ? supplierRisks.map((supplier) => `${supplier.name} is under review.`) : ["No suppliers currently under review."],
    inventoryForecast: withKnowledgeCitation(
      relevantDocuments,
      `${company.warehouses.length} warehouse${company.warehouses.length === 1 ? "" : "s"} tracked; stock levels are ${lowStock.length > 0 ? "tightening" : "healthy"} overall.`,
    ),
    warehouseIssues: busyWarehouses.length > 0 ? busyWarehouses.map((warehouse) => `${warehouse.name} is at ${warehouse.utilizationPct}% capacity.`) : ["No warehouse capacity issues flagged."],
  };
}

function buildHrAnalysisBase(
  document: DigitalDocument,
  company: GeneratedCompany,
  _currentUser: EnterpriseUser,
  relevantDocuments: DigitalDocument[],
): Record<string, string | string[]> {
  return {
    leaveSummary: withKnowledgeCitation(
      relevantDocuments,
      `No unusual leave patterns flagged across ${company.profile.employeeCount.toLocaleString()} employees.`,
    ),
    hiringNeeds: [`No urgent hiring need flagged for ${document.department} at this time.`],
    trainingNeeds: [document.category === "Training" ? `${document.name} may inform onboarding for ${document.department}.` : `No training gap flagged from ${document.name}.`],
    staffRisks: ["No elevated staff risk identified."],
    recommendedActions: [`File ${document.name} with the ${document.department} personnel record set.`],
  };
}

const WORKER_ANALYSIS_CONFIGS: Record<PersonaId, PersonaConfig> = {
  executive: {
    workerId: "executive",
    personaLabel: "Executive Worker",
    sectionSchema: [
      { key: "executiveSummary", label: "Executive Summary", type: "text" },
      { key: "businessRisks", label: "Business Risks", type: "list" },
      { key: "opportunities", label: "Opportunities", type: "list" },
      { key: "recommendedDecisions", label: "Recommended Decisions", type: "list" },
    ],
    systemPrompt:
      'You are an experienced CEO advisor for this enterprise, speaking with the authority and judgment of a seasoned executive — not a generic assistant. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "executiveSummary" (string), "businessRisks" (array of strings), "opportunities" (array of strings), "recommendedDecisions" (array of strings).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    buildDeterministicBase: buildExecutiveAnalysisBase,
  },
  "executive-assistant": {
    workerId: "executive",
    personaLabel: "Executive Assistant",
    sectionSchema: [
      { key: "todaysPriorities", label: "Today's Priorities", type: "list" },
      { key: "upcomingMeetings", label: "Upcoming Meetings", type: "list" },
      { key: "pendingTasks", label: "Pending Tasks", type: "list" },
      { key: "importantFollowUps", label: "Important Follow-ups", type: "list" },
      { key: "approvalReminders", label: "Approval Reminders", type: "list" },
      { key: "personalRecommendations", label: "Personal Recommendations", type: "list" },
    ],
    systemPrompt:
      'You are the Executive Assistant for an enterprise Digital Workforce platform, personalized for the current logged-in user. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "todaysPriorities" (array of strings), "upcomingMeetings" (array of strings), "pendingTasks" (array of strings), "importantFollowUps" (array of strings), "approvalReminders" (array of strings), "personalRecommendations" (array of strings).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    buildDeterministicBase: buildExecutiveAssistantAnalysisBase,
  },
  sales: {
    workerId: "sales",
    personaLabel: "Sales Worker",
    sectionSchema: [
      { key: "topCustomers", label: "Top Customers", type: "list" },
      { key: "inactiveCustomers", label: "Inactive Customers", type: "list" },
      { key: "salesOpportunities", label: "Sales Opportunities", type: "list" },
      { key: "followUpPlan", label: "Follow-up Plan", type: "list" },
      { key: "salesForecast", label: "Sales Forecast", type: "text" },
    ],
    systemPrompt:
      'You are the Sales Worker for an enterprise Digital Workforce platform. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "topCustomers" (array of strings), "inactiveCustomers" (array of strings), "salesOpportunities" (array of strings), "followUpPlan" (array of strings), "salesForecast" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    buildDeterministicBase: buildSalesAnalysisBase,
  },
  finance: {
    workerId: "finance",
    personaLabel: "Finance Worker",
    sectionSchema: [
      { key: "cashFlowSummary", label: "Cash Flow Summary", type: "text" },
      { key: "overdueInvoices", label: "Overdue Invoices", type: "list" },
      { key: "costConcerns", label: "Cost Concerns", type: "list" },
      { key: "financialRisks", label: "Financial Risks", type: "list" },
      { key: "recommendedActions", label: "Recommended Actions", type: "list" },
    ],
    systemPrompt:
      'You are the Finance Worker for an enterprise Digital Workforce platform. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "cashFlowSummary" (string), "overdueInvoices" (array of strings), "costConcerns" (array of strings), "financialRisks" (array of strings), "recommendedActions" (array of strings).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    buildDeterministicBase: buildFinanceAnalysisBase,
  },
  inventory: {
    workerId: "inventory",
    personaLabel: "Inventory Worker",
    sectionSchema: [
      { key: "lowStockItems", label: "Low Stock Items", type: "list" },
      { key: "reorderSuggestions", label: "Reorder Suggestions", type: "list" },
      { key: "supplierRisks", label: "Supplier Risks", type: "list" },
      { key: "inventoryForecast", label: "Inventory Forecast", type: "text" },
      { key: "warehouseIssues", label: "Warehouse Issues", type: "list" },
    ],
    systemPrompt:
      'You are the Inventory Worker for an enterprise Digital Workforce platform. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "lowStockItems" (array of strings), "reorderSuggestions" (array of strings), "supplierRisks" (array of strings), "inventoryForecast" (string), "warehouseIssues" (array of strings).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    buildDeterministicBase: buildInventoryAnalysisBase,
  },
  hr: {
    workerId: "hr",
    personaLabel: "HR Worker",
    sectionSchema: [
      { key: "leaveSummary", label: "Leave Summary", type: "text" },
      { key: "hiringNeeds", label: "Hiring Needs", type: "list" },
      { key: "trainingNeeds", label: "Training Needs", type: "list" },
      { key: "staffRisks", label: "Staff Risks", type: "list" },
      { key: "recommendedActions", label: "Recommended Actions", type: "list" },
    ],
    systemPrompt:
      'You are the HR Worker for an enterprise Digital Workforce platform. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "leaveSummary" (string), "hiringNeeds" (array of strings), "trainingNeeds" (array of strings), "staffRisks" (array of strings), "recommendedActions" (array of strings).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    buildDeterministicBase: buildHrAnalysisBase,
  },
};

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidSectionShape(value: unknown, schema: SectionSchemaEntry[]): value is Record<string, string | string[]> {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return schema.every((entry) =>
    entry.type === "text" ? typeof candidate[entry.key] === "string" : isStringArray(candidate[entry.key]),
  );
}

function toResult(
  personaId: PersonaId,
  config: PersonaConfig,
  data: Record<string, string | string[]>,
  extra: { knowledgeSourcesUsed: KnowledgeSourceUsed[]; modelUsed: string; source: "Demo Mode" | "Live AI"; generationTimeMs: number },
): WorkerAnalysisResult {
  return {
    personaId,
    personaLabel: config.personaLabel,
    sections: config.sectionSchema.map((entry) => ({ key: entry.key, label: entry.label, value: data[entry.key] })),
    ...extra,
  };
}

// The one real AI capability for each of the 6 personas — one document,
// one worker, one JSON call, no retries. The deterministic base always
// renders when Live Mode is off (the default) or when anything below
// fails; the try/catch is the only thing standing between a provider
// hiccup and a broken page, mirroring lib/services/knowledge/
// DocumentIntelligenceService.ts's exact structure.
export async function analyzeDocumentForWorker(
  personaId: PersonaId,
  document: DigitalDocument,
  company: GeneratedCompany,
  currentUser: EnterpriseUser,
): Promise<WorkerAnalysisResult> {
  const config = WORKER_ANALYSIS_CONFIGS[personaId];

  // Company Intelligence — automatically determines which of the
  // worker's own documents are relevant, before anything is generated.
  // Deterministic metadata matching only (department/usedBy), not the
  // vector/embeddings pipeline, so this stays instant and stable in Demo
  // Mode. The picked document is always included; auto-discovered ones
  // are additional context.
  const relevantDocuments = getRelevantDocuments(config.workerId, WORKER_NAMES_BY_ID[config.workerId] ?? config.personaLabel)
    .map((match) => match.document)
    .filter((relevant) => relevant.id !== document.id);
  const knowledgeSourcesUsed: KnowledgeSourceUsed[] = [document, ...relevantDocuments].map((doc) => ({
    id: doc.id,
    name: doc.name,
    source: doc.source,
  }));
  // The one real "a worker used these documents" event — feeds the
  // Knowledge Lifecycle's "Referenced by AI" stage (see
  // lib/company-intelligence/KnowledgeReferenceStore.ts).
  KnowledgeReferenceStore.markReferenced(knowledgeSourcesUsed.map((used) => used.id));

  const baseData = config.buildDeterministicBase(document, company, currentUser, relevantDocuments);
  const base = toResult(personaId, config, baseData, {
    knowledgeSourcesUsed,
    modelUsed: "Deterministic Template",
    source: "Demo Mode",
    generationTimeMs: 0,
  });

  const provider = ProviderRegistry.getActive();
  if (!AiModeStore.isLiveModeEnabled() || provider?.id !== "openai") {
    return base;
  }

  try {
    const startedAt = Date.now();

    // Only these two personas are genuinely personal (Capability 04) — a
    // Live AI response should reflect who's asking, not just the document,
    // otherwise Live Mode would silently regress to non-personalized
    // output for exactly the personas this capability is about.
    const personalizationContext =
      personaId === "executive-assistant" || personaId === "sales"
        ? `\nCurrent User: ${currentUser.name} (${currentUser.role}, ${currentUser.roleLevel})`
        : "";

    const relevantDocumentsContext =
      relevantDocuments.length > 0
        ? `\nOther relevant company documents: ${relevantDocuments.map((doc) => `${doc.name} (${doc.category})`).join(", ")}`
        : "";

    const response = await provider.chat(
      {
        model: provider.listModels()[0]?.id ?? "unknown",
        messages: [
          { role: "system", content: config.systemPrompt },
          {
            role: "user",
            content: `Document: ${document.name}\nDepartment: ${document.department}\nCategory: ${document.category}\nContent: ${document.description}${relevantDocumentsContext}${personalizationContext}`,
          },
        ],
      },
      createProviderContext({ workerId: config.workerId }),
    );

    const generationTimeMs = Date.now() - startedAt;

    if (response.finishReason !== "stop") {
      return base;
    }

    const parsed: unknown = JSON.parse(stripCodeFences(response.content));

    if (!isValidSectionShape(parsed, config.sectionSchema)) {
      return base;
    }

    return toResult(personaId, config, parsed, {
      knowledgeSourcesUsed,
      modelUsed: response.model,
      source: "Live AI",
      generationTimeMs,
    });
  } catch {
    return base;
  }
}
