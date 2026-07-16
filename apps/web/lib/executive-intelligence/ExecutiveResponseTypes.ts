import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

// A structured, clickable next step — real routes only, never a
// fabricated page (Capability 12, Phase C11).
export interface SuggestedAction {
  id: string;
  label: string;
  href: string;
  reason?: string;
}

// Where a piece of the response came from — chunk-level evidence
// (KnowledgeContext citations) or structured-fact provenance
// (TrackedEntityProfile.sources), normalized to one shape so the UI
// only needs to render one list. Never resolved into full document
// content — only surfaced when a consumer explicitly asks for evidence,
// same discipline RetrievalService already established.
export interface EvidenceReference {
  label: string;
  documentId: string;
  department?: string;
  snippet?: string;
}

// Every field optional — the brief's "avoid rigid templates." A
// response adapts to what was actually knowable; nothing here is ever
// fabricated to fill a field that has no grounding.
export interface ExecutiveResponse {
  summary?: string;
  businessImpact?: string;
  recommendation?: string;
  reasoning?: string;
  confidence?: ConfidenceScore;
  evidence?: EvidenceReference[];
  suggestedActions?: SuggestedAction[];
  followUpQuestions?: string[];
  unknownInformation?: string[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// Session-only — no persistence beyond the server process, per the
// brief's "do not implement long-term conversational memory."
export interface ConversationSession {
  id: string;
  companyId: string;
  turns: ConversationTurn[];
  createdAt: string;
  updatedAt: string;
}
