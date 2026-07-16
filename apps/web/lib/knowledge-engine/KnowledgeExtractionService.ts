import { categories, type Category } from "@/data/categories";
import { departments, type Department } from "@/data/departments";
import type { DigitalDocument } from "@/data/documents";
import {
  type DocumentIntelligence,
  type DocumentKnowledgeExtract,
  type ExtractedEntity,
  type ExtractedSwot,
  type TrackedFact,
} from "@/lib/knowledge-engine/KnowledgeExtractionTypes";
import type { KnowledgeSourceReference } from "@/lib/knowledge-engine/KnowledgeSourceTypes";
import { AiModeStore } from "@/lib/llm/AiModeStore";
import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

const DEPARTMENT_SET = new Set<string>(departments.filter((department): department is Department => department !== "All Departments"));
const CATEGORY_SET = new Set<string>(categories);

function resolveDepartment(value: string, fallback: Department): Department {
  return DEPARTMENT_SET.has(value) ? (value as Department) : fallback;
}

function resolveCategory(value: string, fallback: Category): Category {
  return CATEGORY_SET.has(value) ? (value as Category) : fallback;
}

const RECOMMENDED_ACTION_BY_CATEGORY: Record<string, string> = {
  Policies: "Confirm this policy is current and communicated to affected staff.",
  SOP: "Verify the procedure is still followed as written.",
  Finance: "Route to Finance for reconciliation review.",
  Sales: "Share with Sales for pipeline context.",
  HR: "Confirm alignment with current HR policy.",
  Operations: "Route to Operations for process review.",
  Legal: "Have Legal review terms before any renewal or signature.",
  Contracts: "Have Legal review terms before renewal.",
  Inventory: "Cross-check against current stock records.",
  Training: "Confirm training content is current for new hires.",
  Marketing: "Share with Marketing for campaign context.",
  "Customer Service": "Route to Customer Support for reference.",
  Engineering: "Route to Engineering for technical review.",
  Administration: "File for administrative record-keeping.",
};

function firstSentences(text: string, count: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
  return sentences.slice(0, count).join(" ").trim();
}

// Unchanged from DocumentIntelligenceService.ts — the always-present,
// deterministic executive brief, never empty, never dependent on an AI
// provider being configured.
function buildDeterministicIntelligence(document: DigitalDocument): DocumentIntelligence {
  const summarySource = firstSentences(document.description, 2) || document.description;

  const keyFindings = [
    `Classified under ${document.category} for the ${document.department} department.`,
    `File type: ${document.fileType}${document.tags.length > 0 ? `; tagged ${document.tags.join(", ")}` : ""}.`,
  ];

  const businessRisks = [
    "No elevated risk identified from the available content — review manually if this document governs a compliance-sensitive process.",
  ];

  const businessOpportunities = [
    `Now searchable in the Knowledge Hub — ${document.department} can reference it without a manual request.`,
  ];

  const recommendedActions = [
    RECOMMENDED_ACTION_BY_CATEGORY[document.category] ?? `Route to ${document.department} for review.`,
  ];

  const executiveConclusion = `${document.name} is indexed and available for executive reference; no further action is required unless flagged above.`;

  return {
    executiveSummary: summarySource,
    keyFindings,
    businessRisks,
    businessOpportunities,
    recommendedActions,
    executiveConclusion,
    suggestedCategory: document.category,
    suggestedDepartment: document.department,
    confidence: {
      value: 1,
      label: "High",
      basis: "Deterministic — this document's category and department are already known, not inferred.",
    },
    knowledgeTags: document.tags.length > 0 ? document.tags : [document.category, document.department],
    knowledgeSourcesUsed: [document.name],
    modelUsed: "Deterministic Template",
    source: "Demo Mode",
    generationTimeMs: 0,
  };
}

function buildDeterministicExtract(document: DigitalDocument): DocumentKnowledgeExtract {
  return {
    legacy: buildDeterministicIntelligence(document),
    products: [],
    services: [],
    departments: [],
    customers: [],
    suppliers: [],
    policies: [],
    processes: [],
    kpis: [],
    objectives: [],
    risks: [],
    opportunities: [],
    compliance: [],
    importantDates: [],
    glossary: [],
    keyPeople: [],
    contacts: [],
  };
}

// A model wrapping its JSON in a ```json fence despite instructions not to
// is common enough to strip defensively — this is cleanup of the one
// response already in hand, not a retry or a second call.
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

interface RawLegacyShape {
  executiveSummary: string;
  keyFindings: string[];
  businessRisks: string[];
  businessOpportunities: string[];
  recommendedActions: string[];
  executiveConclusion: string;
  suggestedDepartment: string;
  suggestedCategory: string;
  confidenceValue: number;
  confidenceBasis: string;
  knowledgeTags: string[];
}

// The core, UI-facing shape must still be strictly validated (both
// consumers depend on every field existing) — invalid/missing shape
// falls back to the deterministic base exactly as DocumentIntelligenceService
// always did.
function isValidLegacyShape(value: unknown): value is RawLegacyShape {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.executiveSummary === "string" &&
    isStringArray(candidate.keyFindings) &&
    isStringArray(candidate.businessRisks) &&
    isStringArray(candidate.businessOpportunities) &&
    isStringArray(candidate.recommendedActions) &&
    typeof candidate.executiveConclusion === "string" &&
    typeof candidate.suggestedDepartment === "string" &&
    typeof candidate.suggestedCategory === "string" &&
    typeof candidate.confidenceValue === "number" &&
    typeof candidate.confidenceBasis === "string" &&
    isStringArray(candidate.knowledgeTags)
  );
}

function confidenceFromValue(value: number, basis: string): ConfidenceScore {
  const bounded = Math.min(1, Math.max(0, value));
  return {
    value: bounded,
    label: bounded >= 0.7 ? "High" : bounded >= 0.4 ? "Medium" : "Low",
    basis,
  };
}

interface RawEntity {
  name?: unknown;
  detail?: unknown;
  confidence?: unknown;
}

// Best-effort, not all-or-nothing: a malformed or missing entity list
// simply becomes empty (Step 10 — unknown stays unknown, it never blocks
// the rest of the extraction from returning).
function parseEntityList(value: unknown, source: KnowledgeSourceReference, now: string): TrackedFact<ExtractedEntity>[] {
  if (!Array.isArray(value)) return [];

  const result: TrackedFact<ExtractedEntity>[] = [];
  for (const item of value as RawEntity[]) {
    if (!item || typeof item.name !== "string" || item.name.trim().length === 0) continue;
    const confidenceValue = typeof item.confidence === "number" ? item.confidence : 0.6;
    result.push({
      value: { name: item.name.trim(), detail: typeof item.detail === "string" ? item.detail : undefined },
      confidence: confidenceFromValue(confidenceValue, "Extracted from document content."),
      sources: [source],
      createdAt: now,
      updatedAt: now,
    });
  }
  return result;
}

function parseScalarFact(value: unknown, confidenceValue: unknown, source: KnowledgeSourceReference, now: string): TrackedFact<string> | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const bounded = typeof confidenceValue === "number" ? confidenceValue : 0.6;
  return {
    value: value.trim(),
    confidence: confidenceFromValue(bounded, "Extracted from document content."),
    sources: [source],
    createdAt: now,
    updatedAt: now,
  };
}

function parseSwot(value: unknown, confidenceValue: unknown, source: KnowledgeSourceReference, now: string): TrackedFact<ExtractedSwot> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Record<string, unknown>;
  if (!isStringArray(candidate.strengths) && !isStringArray(candidate.weaknesses) && !isStringArray(candidate.opportunities) && !isStringArray(candidate.threats)) {
    return undefined;
  }
  const bounded = typeof confidenceValue === "number" ? confidenceValue : 0.6;
  return {
    value: {
      strengths: isStringArray(candidate.strengths) ? candidate.strengths : [],
      weaknesses: isStringArray(candidate.weaknesses) ? candidate.weaknesses : [],
      opportunities: isStringArray(candidate.opportunities) ? candidate.opportunities : [],
      threats: isStringArray(candidate.threats) ? candidate.threats : [],
    },
    confidence: confidenceFromValue(bounded, "Extracted from document content."),
    sources: [source],
    createdAt: now,
    updatedAt: now,
  };
}

const ENTITY_LIST_FIELDS = [
  "products",
  "services",
  "departments",
  "customers",
  "suppliers",
  "policies",
  "processes",
  "kpis",
  "objectives",
  "risks",
  "opportunities",
  "compliance",
  "importantDates",
  "glossary",
  "keyPeople",
  "contacts",
] as const;

// The single real LLM-backed capability behind Knowledge Extraction
// (Step 2) — supersedes lib/services/knowledge/DocumentIntelligenceService.ts,
// which is now deleted. Same proven discipline: deterministic base always
// built first; Live Mode off or a non-OpenAI provider returns it
// unchanged (no network call); the AI path is wrapped end-to-end in
// try/catch so a provider hiccup never breaks a caller. The legacy
// DocumentIntelligence-shaped fields are strictly validated (existing UI
// depends on them); the new structured fields are parsed best-effort —
// a malformed or absent entity list is simply empty, never blocking or
// fabricated (Step 10).
export async function extractKnowledge(document: DigitalDocument): Promise<DocumentKnowledgeExtract> {
  const base = buildDeterministicExtract(document);

  const provider = ProviderRegistry.getActive();
  if (!AiModeStore.isLiveModeEnabled() || provider?.id !== "openai") {
    return base;
  }

  try {
    const startedAt = Date.now();

    const response = await provider.chat(
      {
        model: provider.listModels()[0]?.id ?? "unknown",
        messages: [
          {
            role: "system",
            content:
              'You are the Enterprise Knowledge Engine for an enterprise Digital Workforce platform. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary, no text before or after it. Never invent facts: if a field is not supported by the document content, omit it (for single values) or leave its array empty. Every entity in a list must include a "confidence" number from 0 to 1. The object must have exactly these keys: "executiveSummary" (string, 2-3 sentences), "keyFindings" (string array), "businessRisks" (string array), "businessOpportunities" (string array), "recommendedActions" (string array), "executiveConclusion" (string, 1-2 sentences), "suggestedDepartment" (one of: "Executive", "Finance", "Sales", "HR", "Operations", "Warehouse", "Customer Support", "Marketing", "IT"), "suggestedCategory" (one of: "Policies", "SOP", "Finance", "Sales", "HR", "Operations", "Legal", "Contracts", "Inventory", "Training", "Marketing", "Customer Service", "Engineering", "Administration"), "confidenceValue" (0-1), "confidenceBasis" (string), "knowledgeTags" (2-5 short strings), "companyName" (string or null), "companyNameConfidence" (0-1), "industry" (string or null), "industryConfidence" (0-1), "businessModel" (string or null), "businessModelConfidence" (0-1), "products", "services", "departments", "customers", "suppliers", "policies", "processes", "kpis", "objectives", "risks", "opportunities", "compliance", "importantDates", "glossary", "keyPeople", "contacts" (each an array of {"name": string, "detail": string, "confidence": 0-1} — omit any entity type not present in the document), "swot" ({"strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[]} or null), "swotConfidence" (0-1).',
          },
          {
            role: "user",
            content: `Document: ${document.name}\nDepartment: ${document.department}\nCategory: ${document.category}\nContent: ${document.description}`,
          },
        ],
      },
      createProviderContext({ workerId: "executive" }),
    );

    const generationTimeMs = Date.now() - startedAt;

    if (response.finishReason !== "stop") {
      return base;
    }

    const parsed: unknown = JSON.parse(stripCodeFences(response.content));

    if (!isValidLegacyShape(parsed)) {
      return base;
    }

    const raw = parsed as RawLegacyShape & Record<string, unknown>;
    const confidenceValue = Math.min(1, Math.max(0, raw.confidenceValue));

    const legacy: DocumentIntelligence = {
      executiveSummary: raw.executiveSummary,
      keyFindings: raw.keyFindings,
      businessRisks: raw.businessRisks,
      businessOpportunities: raw.businessOpportunities,
      recommendedActions: raw.recommendedActions,
      executiveConclusion: raw.executiveConclusion,
      suggestedDepartment: resolveDepartment(raw.suggestedDepartment, document.department),
      suggestedCategory: resolveCategory(raw.suggestedCategory, document.category),
      confidence: {
        value: confidenceValue,
        label: confidenceValue >= 0.7 ? "High" : confidenceValue >= 0.4 ? "Medium" : "Low",
        basis: raw.confidenceBasis,
      },
      knowledgeTags: raw.knowledgeTags,
      knowledgeSourcesUsed: [document.name],
      modelUsed: response.model,
      source: "Live AI",
      generationTimeMs,
    };

    const source: KnowledgeSourceReference = { sourceType: "document", sourceId: document.id, label: document.name };
    const now = new Date().toISOString();

    const extract: DocumentKnowledgeExtract = {
      legacy,
      companyName: parseScalarFact(raw.companyName, raw.companyNameConfidence, source, now),
      industry: parseScalarFact(raw.industry, raw.industryConfidence, source, now),
      businessModel: parseScalarFact(raw.businessModel, raw.businessModelConfidence, source, now),
      swot: parseSwot(raw.swot, raw.swotConfidence, source, now),
      products: [],
      services: [],
      departments: [],
      customers: [],
      suppliers: [],
      policies: [],
      processes: [],
      kpis: [],
      objectives: [],
      risks: [],
      opportunities: [],
      compliance: [],
      importantDates: [],
      glossary: [],
      keyPeople: [],
      contacts: [],
    };

    for (const field of ENTITY_LIST_FIELDS) {
      extract[field] = parseEntityList(raw[field], source, now);
    }

    return extract;
  } catch {
    // Covers a malformed JSON parse failure and any other unexpected
    // error in the AI path above — never surfaced to the client, never
    // retried, always the same deterministic fallback.
    return base;
  }
}
