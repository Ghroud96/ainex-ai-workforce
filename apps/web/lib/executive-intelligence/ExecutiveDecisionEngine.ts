import type { ExecutiveIntent, ExecutiveIntentCategory } from "@/lib/executive-intelligence/ExecutiveIntentRouter";
import type { CompanyIntelligenceProfile, TrackedEntityProfile } from "@/lib/knowledge-engine/CompanyIntelligenceTypes";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

export type ExecutiveDecisionCategory = "risk" | "opportunity" | "department" | "customer" | "process" | "policy" | "missing-information";
export type ExecutiveDecisionPriority = "Critical" | "High" | "Medium" | "Low";

export interface ExecutiveDecisionInsight {
  category: ExecutiveDecisionCategory;
  title: string;
  detail?: string;
  priority: ExecutiveDecisionPriority;
  relatedEntityId?: string;
  confidence: ConfidenceScore;
}

// Rule-based (no LLM), converts a full CompanyIntelligenceProfile into
// executive recommendations — the brief's eight named examples (highest
// risk, most urgent opportunity, department needing attention, critical
// customer, operational bottleneck, policy conflict, missing
// information, decision priority). Channel-agnostic: takes no session/
// conversation concept, so a future Dashboard-action or Workflow-
// recommendation caller can call it directly (Capability 12).

function topByConfidence(entities: TrackedEntityProfile[]): TrackedEntityProfile | undefined {
  if (entities.length === 0) return undefined;
  return [...entities].sort((a, b) => b.confidence.value - a.confidence.value || b.sources.length - a.sources.length)[0];
}

function priorityFor(category: ExecutiveDecisionCategory, confidenceValue: number): ExecutiveDecisionPriority {
  if (category === "missing-information") return "Low";
  if (confidenceValue >= 0.75) return category === "risk" ? "Critical" : "High";
  if (confidenceValue >= 0.5) return "Medium";
  return "Low";
}

function mentionsEntity(entities: TrackedEntityProfile[], name: string): boolean {
  const needle = name.toLowerCase();
  return entities.some((entity) => `${entity.name} ${entity.detail ?? ""}`.toLowerCase().includes(needle));
}

export function identifyHighestRisk(profile: CompanyIntelligenceProfile): ExecutiveDecisionInsight | undefined {
  const top = topByConfidence(profile.risks);
  if (!top) return undefined;
  return { category: "risk", title: top.name, detail: top.detail, priority: priorityFor("risk", top.confidence.value), relatedEntityId: top.id, confidence: top.confidence };
}

export function identifyMostUrgentOpportunity(profile: CompanyIntelligenceProfile): ExecutiveDecisionInsight | undefined {
  const top = topByConfidence(profile.opportunities);
  if (!top) return undefined;
  return { category: "opportunity", title: top.name, detail: top.detail, priority: priorityFor("opportunity", top.confidence.value), relatedEntityId: top.id, confidence: top.confidence };
}

// Prefers the department most referenced across tracked risks/
// opportunities (needs attention because something is already flagged
// against it); falls back to the least-documented department (needs
// attention because AINEX understands it the least) when nothing
// mentions any department by name yet.
export function identifyDepartmentNeedingAttention(profile: CompanyIntelligenceProfile): ExecutiveDecisionInsight | undefined {
  if (profile.departments.length === 0) return undefined;

  const withMentions = profile.departments
    .map((department) => ({
      department,
      mentions: [...profile.risks, ...profile.opportunities].filter((entity) =>
        `${entity.name} ${entity.detail ?? ""}`.toLowerCase().includes(department.name.toLowerCase()),
      ).length,
    }))
    .sort((a, b) => b.mentions - a.mentions)[0];

  if (withMentions.mentions > 0) {
    const count = withMentions.mentions;
    return {
      category: "department",
      title: withMentions.department.name,
      detail: `Referenced in ${count} tracked risk${count === 1 ? "" : "s"}/opportunit${count === 1 ? "y" : "ies"}.`,
      priority: "High",
      relatedEntityId: withMentions.department.id,
      confidence: withMentions.department.confidence,
    };
  }

  const leastUnderstood = [...profile.departments].sort((a, b) => a.confidence.value - b.confidence.value)[0];
  return {
    category: "department",
    title: leastUnderstood.name,
    detail: "The least-documented department in Company Intelligence so far.",
    priority: "Medium",
    relatedEntityId: leastUnderstood.id,
    confidence: leastUnderstood.confidence,
  };
}

export function identifyCriticalCustomer(profile: CompanyIntelligenceProfile): ExecutiveDecisionInsight | undefined {
  if (profile.customers.length === 0) return undefined;

  const flagged = profile.customers.find((customer) => mentionsEntity(profile.risks, customer.name));
  const chosen = flagged ?? topByConfidence(profile.customers);
  if (!chosen) return undefined;

  return {
    category: "customer",
    title: chosen.name,
    detail: flagged ? "Named in a tracked business risk." : chosen.detail,
    priority: flagged ? "High" : priorityFor("customer", chosen.confidence.value),
    relatedEntityId: chosen.id,
    confidence: chosen.confidence,
  };
}

export function identifyOperationalBottleneck(profile: CompanyIntelligenceProfile): ExecutiveDecisionInsight | undefined {
  if (profile.processes.length === 0) return undefined;

  const flagged = profile.processes.find((process) => mentionsEntity(profile.risks, process.name));
  const chosen = flagged ?? [...profile.processes].sort((a, b) => a.confidence.value - b.confidence.value)[0];

  return {
    category: "process",
    title: chosen.name,
    detail: flagged ? "Named in a tracked business risk." : chosen.detail,
    priority: flagged ? "High" : "Medium",
    relatedEntityId: chosen.id,
    confidence: chosen.confidence,
  };
}

// A simple, documented heuristic — two policies sharing a significant
// name keyword but differing detail are flagged as needing manual
// review. Never asserted as a confirmed conflict (Step 10 — no
// hallucination): the confidence is deliberately low.
export function identifyPolicyConflicts(profile: CompanyIntelligenceProfile): ExecutiveDecisionInsight[] {
  const groups = new Map<string, TrackedEntityProfile[]>();
  for (const policy of profile.policies) {
    const words = policy.name.toLowerCase().split(/\s+/).filter((word) => word.length > 4);
    const keyword = words[0] ?? policy.name.toLowerCase();
    groups.set(keyword, [...(groups.get(keyword) ?? []), policy]);
  }

  const conflicts: ExecutiveDecisionInsight[] = [];
  for (const [keyword, group] of groups) {
    if (group.length < 2) continue;
    const distinctDetails = new Set(group.map((policy) => policy.detail ?? ""));
    if (distinctDetails.size <= 1) continue;

    conflicts.push({
      category: "policy",
      title: `Possible conflicting guidance on "${keyword}"`,
      detail: `${group.map((policy) => policy.name).join(" vs. ")} — needs manual review, not a confirmed conflict.`,
      priority: "Medium",
      confidence: { value: 0.4, label: "Low", basis: "Heuristic name-overlap match, not verified." },
    });
  }
  return conflicts;
}

export const MISSING_FIELD_LABELS: Partial<Record<keyof CompanyIntelligenceProfile, string>> = {
  departments: "departments",
  products: "products",
  services: "services",
  customers: "customers",
  suppliers: "suppliers",
  policies: "policies",
  processes: "processes",
  risks: "business risks",
  opportunities: "growth opportunities",
  objectives: "business objectives",
  kpis: "KPIs",
  compliance: "compliance items",
  importantDates: "important dates",
  glossary: "glossary terms",
  keyPeople: "key people",
  contacts: "contacts",
};

// Directly observed absence, never inferred — matches "Unknown
// Information" (Step 10): "I currently do not have enough verified
// information about X."
export function identifyMissingInformation(profile: CompanyIntelligenceProfile): string[] {
  const gaps: string[] = [];
  if (!profile.company.companyName) gaps.push("a verified company name");
  if (!profile.company.industry) gaps.push("a verified industry classification");
  if (!profile.company.businessModel) gaps.push("a verified business model");

  for (const [field, label] of Object.entries(MISSING_FIELD_LABELS)) {
    const list = profile[field as keyof CompanyIntelligenceProfile] as TrackedEntityProfile[] | undefined;
    if (Array.isArray(list) && list.length === 0) gaps.push(label);
  }
  return gaps;
}

const INTENT_TO_DECISION_CATEGORY: Partial<Record<ExecutiveIntentCategory, ExecutiveDecisionCategory>> = {
  risk: "risk",
  opportunity: "opportunity",
  department: "department",
  customer: "customer",
  process: "process",
  policy: "policy",
};

const PRIORITY_WEIGHT: Record<ExecutiveDecisionPriority, number> = { Critical: 3, High: 2, Medium: 1, Low: 0 };

// Combines every insight above into one ranked list, focused toward the
// asked-about category/entities when an ExecutiveIntent is given —
// falls back to the full cross-category ranking for "general",
// "comparison", and "trend" intents (or any category with no dedicated
// insight generator, e.g. product/supplier/kpi/compliance questions,
// which ConversationService answers directly from the profile instead).
export function prioritizeDecisions(profile: CompanyIntelligenceProfile, intent?: ExecutiveIntent): ExecutiveDecisionInsight[] {
  const insights: ExecutiveDecisionInsight[] = [];
  const risk = identifyHighestRisk(profile);
  const opportunity = identifyMostUrgentOpportunity(profile);
  const department = identifyDepartmentNeedingAttention(profile);
  const customer = identifyCriticalCustomer(profile);
  const bottleneck = identifyOperationalBottleneck(profile);

  if (risk) insights.push(risk);
  if (opportunity) insights.push(opportunity);
  if (department) insights.push(department);
  if (customer) insights.push(customer);
  if (bottleneck) insights.push(bottleneck);
  insights.push(...identifyPolicyConflicts(profile));

  const missing = identifyMissingInformation(profile);
  if (missing.length > 0) {
    insights.push({
      category: "missing-information",
      title: "Company Intelligence has coverage gaps",
      detail: `No verified information yet for: ${missing.join(", ")}.`,
      priority: "Low",
      confidence: { value: 1, label: "High", basis: "Directly observed from the profile — not inferred." },
    });
  }

  const sorted = insights.sort((a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] || b.confidence.value - a.confidence.value);

  const targetCategory = intent ? INTENT_TO_DECISION_CATEGORY[intent.category] : undefined;
  if (!targetCategory) return sorted;

  const focused = sorted.filter((insight) => insight.category === targetCategory);
  const rest = sorted.filter((insight) => insight.category !== targetCategory);
  return focused.length > 0 ? [...focused, ...rest] : sorted;
}
