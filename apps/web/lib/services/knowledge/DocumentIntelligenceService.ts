import type { DigitalDocument } from "@/data/documents";
import { AiModeStore } from "@/lib/llm/AiModeStore";
import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";

export interface DocumentIntelligence {
  executiveSummary: string;
  keyFindings: string[];
  businessRisks: string[];
  businessOpportunities: string[];
  recommendedActions: string[];
  executiveConclusion: string;
  knowledgeSourcesUsed: string[];
  modelUsed: string;
  source: "Demo Mode" | "Live AI";
  generationTimeMs: number;
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

// The always-present, deterministic executive brief — built entirely from
// the document's own real or placeholder content plus its metadata, same
// prose-composition style as buildCompanyStory / buildExecutiveAskAnswer
// elsewhere in lib/enterprise/. Never empty, never depends on an AI
// provider being configured. Deliberately generic per field (not a second
// or third 14-entry category map like RECOMMENDED_ACTION_BY_CATEGORY) to
// avoid over-engineering — only the recommended action reuses that
// existing, already-tuned lookup.
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
    knowledgeSourcesUsed: [document.name],
    modelUsed: "Deterministic Template",
    source: "Demo Mode",
    generationTimeMs: 0,
  };
}

interface ParsedIntelligence {
  executiveSummary: string;
  keyFindings: string[];
  businessRisks: string[];
  businessOpportunities: string[];
  recommendedActions: string[];
  executiveConclusion: string;
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

// Valid JSON alone isn't enough to trust — a model can return well-formed
// JSON in the wrong shape (e.g. `{"summary": "..."}`). Both failure modes
// (invalid JSON, wrong shape) are treated identically: fall back to the
// deterministic base, never render a partial or malformed result.
function isValidIntelligenceShape(value: unknown): value is ParsedIntelligence {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.executiveSummary === "string" &&
    isStringArray(candidate.keyFindings) &&
    isStringArray(candidate.businessRisks) &&
    isStringArray(candidate.businessOpportunities) &&
    isStringArray(candidate.recommendedActions) &&
    typeof candidate.executiveConclusion === "string"
  );
}

// Executive Worker "explains and summarizes" a document — the one real AI
// capability in AINEX today, scoped to exactly this worker and exactly one
// uploaded document at a time (no RAG, no vector search, no multi-document
// reasoning). The deterministic base above always renders when Live Mode
// is off (the default) or when anything below fails; the try/catch is the
// only thing standing between a provider hiccup and a broken page, so it
// wraps the entire AI path, not just the network call.
export async function summarizeDocument(document: DigitalDocument): Promise<DocumentIntelligence> {
  const base = buildDeterministicIntelligence(document);

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
              'You are the Executive Worker for an enterprise Digital Workforce platform. Read the document and respond with ONLY a valid JSON object — no markdown code fences, no commentary, no text before or after it. The object must have exactly these keys: "executiveSummary" (string, 2-3 sentences), "keyFindings" (array of strings), "businessRisks" (array of strings), "businessOpportunities" (array of strings), "recommendedActions" (array of strings), "executiveConclusion" (string, 1-2 sentences).',
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

    // JSON.parse throwing here (malformed JSON) falls straight through to
    // the catch block below and returns `base` — no separate handling
    // needed. A wrong-shape-but-valid-JSON response is caught explicitly
    // by isValidIntelligenceShape immediately after.
    const parsed: unknown = JSON.parse(stripCodeFences(response.content));

    if (!isValidIntelligenceShape(parsed)) {
      return base;
    }

    return {
      executiveSummary: parsed.executiveSummary,
      keyFindings: parsed.keyFindings,
      businessRisks: parsed.businessRisks,
      businessOpportunities: parsed.businessOpportunities,
      recommendedActions: parsed.recommendedActions,
      executiveConclusion: parsed.executiveConclusion,
      knowledgeSourcesUsed: [document.name],
      modelUsed: response.model,
      source: "Live AI",
      generationTimeMs,
    };
  } catch {
    // Covers a malformed JSON parse failure and any other unexpected
    // error in the AI path above — never surfaced to the client, never
    // retried, always the same deterministic fallback.
    return base;
  }
}
