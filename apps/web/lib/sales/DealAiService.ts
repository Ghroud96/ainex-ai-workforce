import type { DigitalDocument } from "@/data/documents";
import { getRelevantDocuments, withKnowledgeCitation } from "@/lib/company-intelligence/RelevantKnowledge";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import { formatCurrency, getOutstandingInvoices } from "@/lib/enterprise/CompanyGenerator";
import type { Customer, GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import { AiModeStore } from "@/lib/llm/AiModeStore";
import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import type { DealAiResult, DealConfidence, DealTouchpointId, SalesDeal } from "@/lib/sales/SalesDealTypes";

interface TouchpointBuildOutput {
  aiAnalysis: string;
  businessRecommendation: string;
  estimatedBusinessImpact: string;
  confidence: DealConfidence;
  suggestedNextAction: string;
}

interface TouchpointConfig {
  label: string;
  workerId: "sales" | "finance";
  systemPrompt: string;
  build: (
    deal: SalesDeal,
    customer: Customer,
    company: GeneratedCompany,
    currentUser: EnterpriseUser,
    relevantDocuments: DigitalDocument[],
  ) => TouchpointBuildOutput;
}

const KNOWLEDGE_CITATION_INSTRUCTION =
  " If relevant company documents are listed in the user message, reference them naturally by name (e.g. \"Based on your Sales SOP...\", \"According to your Pricing sheet...\") — never invent a document that wasn't provided.";

// A grounding-strength signal, not a business-metric count (these 8
// touchpoints mostly reason over a single customer/deal, not a
// population), mirroring ConfidenceScore.ts's exact Low/Medium/High
// thresholds so "confidence" means the same thing everywhere in the app.
function confidenceFor(strength: "strong" | "moderate" | "weak"): DealConfidence {
  const value = strength === "strong" ? 0.8 : strength === "moderate" ? 0.55 : 0.3;
  const label: DealConfidence["label"] = value >= 0.7 ? "High" : value >= 0.4 ? "Medium" : "Low";
  return { value, label };
}

function ordersFor(company: GeneratedCompany, customerId: string) {
  return company.salesOrders.filter((order) => order.customerId === customerId);
}

const TOUCHPOINT_CONFIGS: Record<DealTouchpointId, TouchpointConfig> = {
  "customer-analysis": {
    label: "Customer Analysis",
    workerId: "sales",
    systemPrompt:
      'You are the Sales Worker analyzing a customer for follow-up prioritization. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (_deal, customer, company, _currentUser, relevantDocuments) => {
      const orders = ordersFor(company, customer.id);
      const isAtRisk = customer.status === "At Risk";
      return {
        aiAnalysis: withKnowledgeCitation(
          relevantDocuments,
          `${customer.name} is a ${customer.segment} account in ${customer.region} with ${formatCurrency(customer.lifetimeValue, company.profile.currency)} lifetime value and ${orders.length} order${orders.length === 1 ? "" : "s"} on record. Current status: ${customer.status}.`,
        ),
        businessRecommendation: isAtRisk
          ? "Re-engage promptly — this account shows churn risk and needs a proactive check-in."
          : "Account is healthy — approach this follow-up as an upsell or cross-sell opportunity.",
        estimatedBusinessImpact: `${formatCurrency(customer.lifetimeValue, company.profile.currency)} in relationship value at stake.`,
        confidence: confidenceFor(orders.length > 0 ? "strong" : "moderate"),
        suggestedNextAction: `Schedule a meeting with ${customer.contactName}.`,
      };
    },
  },
  "meeting-brief": {
    label: "Meeting Brief",
    workerId: "sales",
    systemPrompt:
      'You are the Sales Worker preparing meeting notes ahead of a customer meeting. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (_deal, customer, company, _currentUser, relevantDocuments) => {
      const orders = ordersFor(company, customer.id);
      const lastOrder = orders[orders.length - 1];
      return {
        aiAnalysis: withKnowledgeCitation(
          relevantDocuments,
          `Prep for meeting with ${customer.contactName} at ${customer.name}: ${lastOrder ? `last order ${lastOrder.orderNumber} for ${formatCurrency(lastOrder.totalAmount, company.profile.currency)}` : "no prior orders on record"}; account status is ${customer.status}.`,
        ),
        businessRecommendation:
          customer.status === "At Risk"
            ? "Lead with a check-in on satisfaction before discussing new business."
            : "Lead with new product opportunities given the account's healthy standing.",
        estimatedBusinessImpact: `Meeting outcome directly shapes the next order from a ${formatCurrency(customer.lifetimeValue, company.profile.currency)} lifetime-value account.`,
        confidence: confidenceFor(lastOrder ? "strong" : "weak"),
        suggestedNextAction: "Hold the meeting and capture key discussion points.",
      };
    },
  },
  "meeting-summary": {
    label: "Meeting Summary",
    workerId: "sales",
    systemPrompt:
      'You are the Sales Worker summarizing a completed customer meeting. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (_deal, customer, _company, _currentUser, relevantDocuments) => ({
      aiAnalysis: withKnowledgeCitation(
        relevantDocuments,
        `Meeting with ${customer.contactName} at ${customer.name} completed. Discussion covered current needs and confirmed interest in moving toward a formal quotation.`,
      ),
      businessRecommendation: "Move forward with a follow-up message within 48 hours to maintain momentum.",
      estimatedBusinessImpact: "Timely follow-up materially improves close rate on active conversations.",
      confidence: confidenceFor("moderate"),
      suggestedNextAction: "Generate a follow-up message.",
    }),
  },
  "generate-follow-up": {
    label: "Generate Follow-up",
    workerId: "sales",
    systemPrompt:
      'You are the Sales Worker drafting a customer follow-up message. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (_deal, customer, _company, _currentUser, relevantDocuments) => ({
      aiAnalysis: withKnowledgeCitation(
        relevantDocuments,
        `Draft follow-up prepared for ${customer.contactName}: thanks them for the meeting, recaps the discussed needs, and confirms the next step is a formal quotation.`,
      ),
      businessRecommendation: "Send within 24-48 hours while the conversation is fresh.",
      estimatedBusinessImpact: "Keeps the deal moving before interest cools.",
      confidence: confidenceFor("strong"),
      suggestedNextAction: "Prepare a quotation.",
    }),
  },
  "quotation-draft": {
    label: "Quotation Draft",
    workerId: "sales",
    systemPrompt:
      'You are the Sales Worker drafting a customer quotation. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (deal, customer, company, _currentUser, relevantDocuments) => {
      const product = company.products[0];
      return {
        aiAnalysis: withKnowledgeCitation(
          relevantDocuments,
          `Draft quotation prepared for ${customer.name}${product ? ` referencing ${product.name} at ${formatCurrency(product.unitPrice, company.profile.currency)} per unit` : ""}, sized to an estimated deal value of ${formatCurrency(deal.estimatedValue, company.profile.currency)}.`,
        ),
        businessRecommendation: "Route to the customer for review before drafting the formal sales order.",
        estimatedBusinessImpact: `${formatCurrency(deal.estimatedValue, company.profile.currency)} quotation ready for customer review.`,
        confidence: confidenceFor(product ? "strong" : "moderate"),
        suggestedNextAction: "Draft the sales order.",
      };
    },
  },
  "sales-order-draft": {
    label: "Sales Order Draft",
    workerId: "sales",
    systemPrompt:
      'You are the Sales Worker drafting a sales order for manager approval. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (deal, customer, company, _currentUser, relevantDocuments) => ({
      aiAnalysis: withKnowledgeCitation(
        relevantDocuments,
        `Draft sales order prepared for ${customer.name} totaling ${formatCurrency(deal.estimatedValue, company.profile.currency)}, ready for manager approval.`,
      ),
      businessRecommendation: "Submit for approval — quotation and customer discussion are both on record.",
      estimatedBusinessImpact: `${formatCurrency(deal.estimatedValue, company.profile.currency)} order pending sign-off.`,
      confidence: confidenceFor("strong"),
      suggestedNextAction: "Submit for manager approval.",
    }),
  },
  "manager-review": {
    label: "Manager Review",
    workerId: "sales",
    systemPrompt:
      'You are a Sales Manager reviewing a sales order for approval. Analyze margin, customer history, prior discounts, and business risk. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (deal, customer, company, _currentUser, relevantDocuments) => {
      const orders = ordersFor(company, customer.id);
      const avgOrder = orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0;
      const sizeNote =
        avgOrder > 0 && deal.estimatedValue > avgOrder * 1.5
          ? "above this customer's typical order size"
          : "in line with this customer's typical order size";
      return {
        aiAnalysis: withKnowledgeCitation(
          relevantDocuments,
          `This ${formatCurrency(deal.estimatedValue, company.profile.currency)} order for ${customer.name} is ${sizeNote}. Customer status: ${customer.status}, lifetime value ${formatCurrency(customer.lifetimeValue, company.profile.currency)}, ${orders.length} prior order${orders.length === 1 ? "" : "s"}.`,
        ),
        businessRecommendation:
          customer.status === "At Risk"
            ? "Approve to support re-engagement, but monitor payment closely."
            : "Approve — account history supports this order.",
        estimatedBusinessImpact: `${formatCurrency(deal.estimatedValue, company.profile.currency)} in revenue contingent on this decision.`,
        confidence: confidenceFor(orders.length > 0 ? "strong" : "moderate"),
        suggestedNextAction: "Approve, reject, or request a revision.",
      };
    },
  },
  "finance-review": {
    label: "Finance Review",
    workerId: "finance",
    systemPrompt:
      'You are the Finance Worker reviewing an approved sales order before order confirmation. Analyze credit exposure, outstanding balance, and payment behaviour. Respond with ONLY a valid JSON object — no markdown code fences, no commentary. Keys: "aiAnalysis" (string), "businessRecommendation" (string), "suggestedNextAction" (string).' +
      KNOWLEDGE_CITATION_INSTRUCTION,
    build: (deal, customer, company, _currentUser, relevantDocuments) => {
      const outstanding = getOutstandingInvoices(company).filter((invoice) => invoice.customerId === customer.id);
      const outstandingTotal = outstanding.reduce((sum, invoice) => sum + invoice.amount, 0);
      return {
        aiAnalysis: withKnowledgeCitation(
          relevantDocuments,
          `${customer.name} has ${outstanding.length} outstanding invoice${outstanding.length === 1 ? "" : "s"} totaling ${formatCurrency(outstandingTotal, company.profile.currency)}. New order value: ${formatCurrency(deal.estimatedValue, company.profile.currency)}.`,
        ),
        businessRecommendation:
          outstanding.length > 0
            ? "Confirm payment terms with the customer before releasing this order."
            : "No outstanding balance on record — clear to approve.",
        estimatedBusinessImpact:
          outstanding.length > 0
            ? `${formatCurrency(outstandingTotal, company.profile.currency)} in existing exposure plus this new order.`
            : `${formatCurrency(deal.estimatedValue, company.profile.currency)} in new revenue with no offsetting risk.`,
        confidence: confidenceFor(outstanding.length > 0 ? "moderate" : "strong"),
        suggestedNextAction: "Approve or reject to confirm the order.",
      };
    },
  },
};

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

interface DealJsonFields {
  aiAnalysis: string;
  businessRecommendation: string;
  suggestedNextAction: string;
}

function isValidDealJson(value: unknown): value is DealJsonFields {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.aiAnalysis === "string" &&
    typeof candidate.businessRecommendation === "string" &&
    typeof candidate.suggestedNextAction === "string"
  );
}

export function getTouchpointLabel(touchpointId: DealTouchpointId): string {
  return TOUCHPOINT_CONFIGS[touchpointId].label;
}

// The same deterministic-base -> one-Live-AI-call -> strict-JSON ->
// safe-fallback skeleton already proven in WorkerAnalysisService.ts,
// copied rather than shared, since this is deal-workflow-specific and
// must not grow that file's persona catalog. Confidence Score and
// Estimated Business Impact are always computed deterministically in
// build() and never touched by the AI JSON schema — the same reasoning
// already established: a smaller AI schema is more reliable to parse,
// and a self-reported AI confidence number is unverifiable.
export async function runDealTouchpoint(
  touchpointId: DealTouchpointId,
  deal: SalesDeal,
  customer: Customer,
  company: GeneratedCompany,
  currentUser: EnterpriseUser,
): Promise<DealAiResult> {
  const config = TOUCHPOINT_CONFIGS[touchpointId];

  // Company Intelligence — same deterministic metadata matching as
  // WorkerAnalysisService.ts, scoped to whichever department this
  // touchpoint belongs to (sales or finance).
  const relevantDocuments = getRelevantDocuments(config.workerId, WORKER_NAMES_BY_ID[config.workerId]).map(
    (match) => match.document,
  );
  const knowledgeSourcesUsed = relevantDocuments.map((doc) => doc.name);

  const built = config.build(deal, customer, company, currentUser, relevantDocuments);
  const base: DealAiResult = {
    touchpointId,
    aiAnalysis: built.aiAnalysis,
    businessRecommendation: built.businessRecommendation,
    estimatedBusinessImpact: built.estimatedBusinessImpact,
    confidence: built.confidence,
    suggestedNextAction: built.suggestedNextAction,
    knowledgeSourcesUsed,
    modelUsed: "Deterministic Template",
    source: "Demo Mode",
    generationTimeMs: 0,
  };

  const provider = ProviderRegistry.getActive();
  if (!AiModeStore.isLiveModeEnabled() || provider?.id !== "openai") {
    return base;
  }

  try {
    const startedAt = Date.now();

    const relevantDocumentsContext =
      relevantDocuments.length > 0
        ? `\nRelevant company documents: ${relevantDocuments.map((doc) => `${doc.name} (${doc.category})`).join(", ")}`
        : "";

    const response = await provider.chat(
      {
        model: provider.listModels()[0]?.id ?? "unknown",
        messages: [
          { role: "system", content: config.systemPrompt },
          {
            role: "user",
            content: `Customer: ${customer.name}\nSegment: ${customer.segment}\nStatus: ${customer.status}\nDeal value: ${formatCurrency(deal.estimatedValue, company.profile.currency)}\nCurrent User: ${currentUser.name} (${currentUser.role})${relevantDocumentsContext}`,
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

    if (!isValidDealJson(parsed)) {
      return base;
    }

    return {
      ...base,
      aiAnalysis: parsed.aiAnalysis,
      businessRecommendation: parsed.businessRecommendation,
      suggestedNextAction: parsed.suggestedNextAction,
      modelUsed: response.model,
      source: "Live AI",
      generationTimeMs,
    };
  } catch {
    return base;
  }
}
