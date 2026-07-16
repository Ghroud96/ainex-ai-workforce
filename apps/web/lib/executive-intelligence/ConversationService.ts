import { ConversationStore } from "@/lib/executive-intelligence/ConversationStore";
import {
  identifyMissingInformation,
  MISSING_FIELD_LABELS,
  prioritizeDecisions,
  type ExecutiveDecisionInsight,
} from "@/lib/executive-intelligence/ExecutiveDecisionEngine";
import { ExecutiveIntentRouter, type ExecutiveIntent, type ExecutiveIntentCategory } from "@/lib/executive-intelligence/ExecutiveIntentRouter";
import type { ConversationSession, EvidenceReference, ExecutiveResponse, SuggestedAction } from "@/lib/executive-intelligence/ExecutiveResponseTypes";
import type { CompanyIntelligenceProfile, TrackedEntityProfile } from "@/lib/knowledge-engine/CompanyIntelligenceTypes";
import { RetrievalService } from "@/lib/knowledge-engine/RetrievalService";
import { AiModeStore } from "@/lib/llm/AiModeStore";
import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

export interface AskResult {
  sessionId: string;
  response: ExecutiveResponse;
}

const INTENT_FIELD_LOOKUP: Partial<Record<ExecutiveIntentCategory, keyof CompanyIntelligenceProfile>> = {
  product: "products",
  supplier: "suppliers",
  kpi: "kpis",
  compliance: "compliance",
};

// Direct profile lookups for the intent categories the Decision Engine
// has no dedicated insight generator for (product/supplier/kpi/
// compliance) — still grounded entirely in real profile data, just a
// simpler "what do we track" read rather than a ranked decision.
function entitiesForIntent(profile: CompanyIntelligenceProfile, intent: ExecutiveIntent): TrackedEntityProfile[] | undefined {
  const field = INTENT_FIELD_LOOKUP[intent.category];
  if (!field) return undefined;
  const list = profile[field] as TrackedEntityProfile[];

  if (intent.entityHints.length > 0) {
    const matched = list.filter((entity) => intent.entityHints.some((hint) => hint.toLowerCase() === entity.name.toLowerCase()));
    if (matched.length > 0) return matched;
  }
  return [...list].sort((a, b) => b.confidence.value - a.confidence.value);
}

function describeBusinessImpact(insight: ExecutiveDecisionInsight): string {
  switch (insight.category) {
    case "risk":
      return `Left unaddressed, "${insight.title}" could affect revenue, customer trust, or delivery timelines.`;
    case "opportunity":
      return `Acting on "${insight.title}" could grow revenue or strengthen a key relationship.`;
    case "department":
      return `"${insight.title}" is where executive attention is most needed right now.`;
    case "customer":
      return `"${insight.title}" is the account most likely to need executive attention.`;
    case "process":
      return `"${insight.title}" is the most likely operational bottleneck today.`;
    case "policy":
      return "Conflicting guidance can create compliance or operational inconsistency.";
    case "missing-information":
      return "Executive decisions in this area currently rely on incomplete information.";
  }
}

function describeRecommendation(insight: ExecutiveDecisionInsight): string {
  switch (insight.category) {
    case "risk":
      return `Review "${insight.title}" and assign an owner today.`;
    case "opportunity":
      return `Prioritize "${insight.title}" with the relevant team this week.`;
    case "department":
      return `Schedule a review with ${insight.title}.`;
    case "customer":
      return `Have the account owner reach out to ${insight.title} directly.`;
    case "process":
      return `Audit "${insight.title}" for delays or manual bottlenecks.`;
    case "policy":
      return "Have the policy owner reconcile the conflicting guidance.";
    case "missing-information":
      return "Upload the relevant documents to close this gap.";
  }
}

function buildFollowUpQuestions(top: ExecutiveDecisionInsight | undefined): string[] {
  if (!top) return ["What information do we have so far?", "What should we upload next to build understanding?"];
  switch (top.category) {
    case "risk":
      return [`Which department owns "${top.title}"?`, "What should we prioritize first?"];
    case "opportunity":
      return [`Which team should act on "${top.title}"?`, "What's the expected business impact?"];
    case "department":
      return [`What risks are tied to ${top.title}?`, "Which KPIs track this department?"];
    case "customer":
      return [`What's our exposure with ${top.title}?`, "What products are affected?"];
    case "process":
      return [`What's causing delays in "${top.title}"?`, "Which department owns this process?"];
    case "policy":
      return ["Who owns these policies?", "When were they last reviewed?"];
    case "missing-information":
      return ["What documents should we upload next?", "Which department should we prioritize learning about?"];
  }
}

function buildSuggestedActions(intent: ExecutiveIntent, top: ExecutiveDecisionInsight | undefined): SuggestedAction[] {
  const actions: SuggestedAction[] = [
    { id: "dashboard", label: "Review Executive Dashboard", href: "/dashboard", reason: "See today's company-wide priorities." },
  ];

  if (top?.category === "risk" || top?.category === "opportunity" || top?.category === "policy") {
    actions.push({ id: "decisions", label: "Open Decision Center", href: "/decisions", reason: "Track and act on this decision." });
  }
  if (intent.category === "product" || intent.category === "customer" || top?.category === "customer") {
    actions.push({ id: "sales-workspace", label: "Review Sales Priorities", href: "/workforce/sales/workspace", reason: "See related accounts and deals." });
  }
  if (top?.category === "missing-information" || (intent.category === "general" && !top)) {
    actions.push({ id: "knowledge-hub", label: "Open Knowledge Hub", href: "/knowledge", reason: "Upload documents to build Company Intelligence." });
  }
  return actions;
}

function buildEvidence(context: KnowledgeContext): EvidenceReference[] | undefined {
  if (context.citations.length === 0) return undefined;
  return context.citations.map((citation) => ({ label: citation.label, documentId: citation.documentId, department: citation.department }));
}

// The always-available, no-network-call response — grounded entirely in
// ExecutiveDecisionEngine's rule-based ranking (or a direct profile
// lookup for product/supplier/kpi/compliance questions). This is also
// the fallback the Live-Mode path returns to on any provider failure.
function buildDeterministicResponse(
  profile: CompanyIntelligenceProfile,
  intent: ExecutiveIntent,
  insights: ExecutiveDecisionInsight[],
  evidence: KnowledgeContext,
): ExecutiveResponse {
  const directLookup = entitiesForIntent(profile, intent);
  const unknownInformation = identifyMissingInformation(profile);

  if (directLookup && directLookup.length > 0) {
    const named = directLookup.slice(0, 3);
    const confidenceValue = named.reduce((sum, entity) => sum + entity.confidence.value, 0) / named.length;
    return {
      summary: `Company Intelligence currently tracks: ${named.map((entity) => entity.name).join(", ")}.`,
      reasoning: named.map((entity) => `${entity.name}${entity.detail ? ` — ${entity.detail}` : ""} (${entity.confidence.label.toLowerCase()} confidence).`).join(" "),
      confidence: { value: confidenceValue, label: confidenceValue >= 0.7 ? "High" : confidenceValue >= 0.4 ? "Medium" : "Low", basis: "Rule-based read of tracked profile entities." },
      evidence: buildEvidence(evidence),
      suggestedActions: buildSuggestedActions(intent, undefined),
      followUpQuestions: buildFollowUpQuestions(undefined),
      unknownInformation: unknownInformation.length > 0 ? unknownInformation.slice(0, 5) : undefined,
    };
  }

  // A direct-lookup category was asked about (product/supplier/kpi/
  // compliance) but Company Intelligence has zero tracked entities for
  // it — say so honestly instead of silently answering with an
  // unrelated top-priority insight from a different category.
  const lookupField = INTENT_FIELD_LOOKUP[intent.category];
  if (lookupField) {
    const label = MISSING_FIELD_LABELS[lookupField] ?? lookupField;
    return {
      summary: `Company Intelligence doesn't have verified information about ${label} yet.`,
      confidence: { value: 0.2, label: "Low", basis: "No tracked entities for this category yet." },
      suggestedActions: buildSuggestedActions(intent, undefined),
      followUpQuestions: buildFollowUpQuestions(undefined),
      unknownInformation: unknownInformation.length > 0 ? unknownInformation.slice(0, 5) : undefined,
    };
  }

  const top = insights[0];
  if (!top) {
    return {
      summary: "Company Intelligence doesn't have enough verified information yet to answer this confidently.",
      confidence: { value: 0.2, label: "Low", basis: "No relevant profile data has been learned yet." },
      suggestedActions: buildSuggestedActions(intent, undefined),
      followUpQuestions: buildFollowUpQuestions(undefined),
      unknownInformation: unknownInformation.length > 0 ? unknownInformation.slice(0, 5) : undefined,
    };
  }

  return {
    summary: `${top.title}${top.detail ? ` — ${top.detail}` : ""}`,
    businessImpact: describeBusinessImpact(top),
    recommendation: describeRecommendation(top),
    reasoning: `Identified as the top ${top.category} priority (${top.priority}), based on ${top.confidence.label.toLowerCase()} confidence in Company Intelligence.`,
    confidence: top.confidence,
    evidence: buildEvidence(evidence),
    suggestedActions: buildSuggestedActions(intent, top),
    followUpQuestions: buildFollowUpQuestions(top),
    unknownInformation: unknownInformation.length > 0 ? unknownInformation.slice(0, 5) : undefined,
  };
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenceMatch ? fenceMatch[1] : trimmed;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const EXECUTIVE_SYSTEM_PROMPT =
  'You are the Executive Intelligence Engine for an enterprise Digital Workforce platform — an experienced executive advisor, never a generic chatbot. Read the Company Intelligence summary and answer the executive\'s question. Respond with ONLY a valid JSON object — no markdown fences, no commentary. Never invent facts beyond the summary provided; if something is not covered, say so in "unknownInformation" instead of guessing. Keys (all optional, include only what is genuinely supported): "summary" (string), "businessImpact" (string), "recommendation" (string), "reasoning" (string), "confidenceValue" (0-1), "confidenceBasis" (string), "followUpQuestions" (array of 2-3 specific, non-generic strings), "unknownInformation" (array of strings).';

// Compact — Retrieval already scoped this to relevant evidence; this is
// a serialization of the ALREADY-RETRIEVED profile/insights, not a
// second retrieval pass, so this call never re-reads source documents.
function summarizeProfile(profile: CompanyIntelligenceProfile, insights: ExecutiveDecisionInsight[]): string {
  const lines: string[] = [];
  if (profile.company.companyName) lines.push(`Company: ${profile.company.companyName.value}`);
  if (profile.company.industry) lines.push(`Industry: ${profile.company.industry.value}`);
  lines.push(`Top decision insights: ${insights.slice(0, 5).map((insight) => `${insight.title} (${insight.category}, ${insight.priority})`).join("; ") || "none yet"}`);
  return lines.join("\n");
}

async function buildLiveResponse(
  profile: CompanyIntelligenceProfile,
  intent: ExecutiveIntent,
  insights: ExecutiveDecisionInsight[],
  evidence: KnowledgeContext,
  session: ConversationSession,
  fallback: ExecutiveResponse,
): Promise<ExecutiveResponse> {
  const provider = ProviderRegistry.getActive();
  if (!provider) return fallback;

  try {
    const history = session.turns.slice(-6).map((turn) => ({ role: turn.role === "user" ? ("user" as const) : ("assistant" as const), content: turn.content }));

    const response = await provider.chat(
      {
        model: provider.listModels()[0]?.id ?? "unknown",
        messages: [
          { role: "system", content: EXECUTIVE_SYSTEM_PROMPT },
          ...history,
          { role: "user", content: `Question: ${intent.rawInput}\n\nCompany Intelligence summary:\n${summarizeProfile(profile, insights)}` },
        ],
      },
      createProviderContext({ workerId: "executive" }),
    );

    if (response.finishReason !== "stop") return fallback;

    const parsed = JSON.parse(stripCodeFences(response.content)) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return fallback;

    const confidenceValue = typeof parsed.confidenceValue === "number" ? Math.min(1, Math.max(0, parsed.confidenceValue)) : undefined;

    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      businessImpact: typeof parsed.businessImpact === "string" ? parsed.businessImpact : fallback.businessImpact,
      recommendation: typeof parsed.recommendation === "string" ? parsed.recommendation : fallback.recommendation,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : fallback.reasoning,
      confidence: confidenceValue !== undefined
        ? ({ value: confidenceValue, label: confidenceValue >= 0.7 ? "High" : confidenceValue >= 0.4 ? "Medium" : "Low", basis: typeof parsed.confidenceBasis === "string" ? parsed.confidenceBasis : "Live AI assessment." } satisfies ConfidenceScore)
        : fallback.confidence,
      evidence: fallback.evidence,
      suggestedActions: fallback.suggestedActions,
      followUpQuestions: isStringArray(parsed.followUpQuestions) ? parsed.followUpQuestions : fallback.followUpQuestions,
      unknownInformation: isStringArray(parsed.unknownInformation) ? parsed.unknownInformation : fallback.unknownInformation,
    };
  } catch {
    // Never surfaced to the client, never retried — same discipline as
    // KnowledgeExtractionService.
    return fallback;
  }
}

// The chat-channel-specific orchestrator — owns session/turns only,
// never business reasoning directly. A future non-chat caller (a
// Dashboard action, a Workflow recommendation trigger) would call
// RetrievalService.forExecutive -> ExecutiveIntentRouter.classify ->
// ExecutiveDecisionEngine.prioritizeDecisions directly, without a
// ConversationSession at all (Capability 12's channel-agnostic core).
export const ConversationService = {
  async ask(sessionId: string | undefined, companyId: string, question: string): Promise<AskResult> {
    const session = (sessionId && ConversationStore.get(sessionId)) || ConversationStore.create(companyId);
    ConversationStore.appendTurn(session.id, { role: "user", content: question, timestamp: new Date().toISOString() });

    const { structured: profile, evidence } = await RetrievalService.forExecutive(question);
    const intent = ExecutiveIntentRouter.classify(question, profile);
    const insights = prioritizeDecisions(profile, intent);

    const deterministic = buildDeterministicResponse(profile, intent, insights, evidence);

    const response =
      AiModeStore.isLiveModeEnabled() && ProviderRegistry.getActive()?.id === "openai"
        ? await buildLiveResponse(profile, intent, insights, evidence, session, deterministic)
        : deterministic;

    ConversationStore.appendTurn(session.id, {
      role: "assistant",
      content: response.summary ?? response.recommendation ?? "No response generated.",
      timestamp: new Date().toISOString(),
    });

    return { sessionId: session.id, response };
  },
};
