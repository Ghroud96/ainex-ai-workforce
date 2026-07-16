import type { CompanyIntelligenceProfile, TrackedEntityProfile } from "@/lib/knowledge-engine/CompanyIntelligenceTypes";

export type ExecutiveIntentCategory =
  | "comparison"
  | "risk"
  | "opportunity"
  | "compliance"
  | "policy"
  | "kpi"
  | "supplier"
  | "customer"
  | "product"
  | "department"
  | "process"
  | "trend"
  | "general";

// Pure, no I/O, no LLM. Runs before ConversationService (or any future
// non-chat caller) so the same input classification works regardless of
// channel — chat, a Dashboard action, a Workflow recommendation trigger
// (Capability 12's channel-agnostic core). `entityHints` are names from
// the company's own profile that appear in the input, so "Tell me about
// Acme Corp" resolves the customer named in the question, not just its
// category.
export interface ExecutiveIntent {
  category: ExecutiveIntentCategory;
  entityHints: string[];
  rawInput: string;
}

// Order matters — checked top to bottom, first match wins. "comparison"
// and "trend" outrank the entity categories because a question like
// "compare our top two risks" is a comparison question first, a risk
// question second.
const CATEGORY_KEYWORDS: Array<[ExecutiveIntentCategory, string[]]> = [
  ["comparison", ["compare", "versus", " vs ", "vs.", "difference between", "which is better", "better than"]],
  ["trend", ["trend", "changed", "change since", "over time", "what changed", "since last", "history of"]],
  ["compliance", ["compliance", "regulation", "regulatory", "audit"]],
  ["policy", ["policy", "policies", "sop", "procedure"]],
  ["kpi", ["kpi", "metric", "target", "performance", "revenue", "margin"]],
  ["risk", ["risk", "threat", "danger", "exposure", "at risk"]],
  ["opportunity", ["opportunity", "opportunities", "growth", "upsell", "expand"]],
  ["supplier", ["supplier", "vendor", "procurement"]],
  ["customer", ["customer", "client", "account", "buyer"]],
  ["product", ["product", "sku", "offering", "item"]],
  ["department", ["department", "team", "division"]],
  ["process", ["process", "workflow", "operation", "bottleneck", "operational"]],
];

function collectEntityNames(profile: CompanyIntelligenceProfile): TrackedEntityProfile[] {
  return [
    ...profile.departments,
    ...profile.products,
    ...profile.services,
    ...profile.customers,
    ...profile.suppliers,
    ...profile.policies,
    ...profile.processes,
    ...profile.risks,
    ...profile.opportunities,
    ...profile.objectives,
    ...profile.kpis,
    ...profile.compliance,
    ...profile.keyPeople,
    ...profile.contacts,
  ];
}

export const ExecutiveIntentRouter = {
  classify(input: string, profile: CompanyIntelligenceProfile): ExecutiveIntent {
    const normalized = ` ${input.toLowerCase()} `;

    let category: ExecutiveIntentCategory = "general";
    for (const [candidate, keywords] of CATEGORY_KEYWORDS) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        category = candidate;
        break;
      }
    }

    const entityHints: string[] = [];
    for (const entity of collectEntityNames(profile)) {
      if (normalized.includes(entity.name.toLowerCase()) && !entityHints.includes(entity.name)) {
        entityHints.push(entity.name);
      }
    }

    return { category, entityHints, rawInput: input };
  },
};
