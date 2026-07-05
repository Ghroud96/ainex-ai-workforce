import { getAllDocuments, type DigitalDocument } from "@/data/documents";
import type { DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { WORKER_DOCUMENT_DEPARTMENTS } from "@/lib/company-intelligence/WorkerKnowledgeMap";

export interface RelevantDocumentMatch {
  document: DigitalDocument;
  matchedOn: "usedBy" | "department";
}

// The deterministic "which Company Intelligence is relevant" step every
// Worker's Run AI action takes before responding. Deliberately NOT routed
// through the existing vector/embeddings pipeline (lib/rag/*,
// lib/retriever/*) — that pipeline always attempts a real OpenAI network
// call for embeddings regardless of Demo/Live mode, which would make
// "the demo should always work perfectly" untrue. This reuses only plain
// document metadata, the same class of matching the existing
// `usedBy`-based filter on /workforce/[slug]/page.tsx already does, just
// widened to also catch documents that only carry a department (uploads,
// once app/knowledge/actions.ts derives usedBy from department).
export function getRelevantDocuments(
  workerId: DepartmentWorkerId,
  workerName: string,
  limit = 3,
): RelevantDocumentMatch[] {
  const documents = getAllDocuments();
  const matchedIds = new Set<string>();
  const matches: RelevantDocumentMatch[] = [];

  for (const document of documents) {
    if (document.usedBy.includes(workerName)) {
      matches.push({ document, matchedOn: "usedBy" });
      matchedIds.add(document.id);
    }
  }

  const relevantDepartments = WORKER_DOCUMENT_DEPARTMENTS[workerId];
  for (const document of documents) {
    if (!matchedIds.has(document.id) && relevantDepartments.includes(document.department)) {
      matches.push({ document, matchedOn: "department" });
      matchedIds.add(document.id);
    }
  }

  return matches.sort((a, b) => b.document.uploadDate.localeCompare(a.document.uploadDate)).slice(0, limit);
}

// A natural-language citation prefix — "Based on your Sales SOP and
// Pricing.xlsx, " — so every AI response (deterministic base or Live AI)
// reads as grounded in named company documents rather than a generic
// answer. Returns "" when nothing relevant was found, so callers can
// prepend it unconditionally.
export function citeKnowledge(documents: DigitalDocument[]): string {
  if (documents.length === 0) return "";
  const names = documents.map((document) => document.name);
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return `Based on your ${joined}, `;
}

// Prepends the citation prefix to a sentence, correctly re-casing the
// sentence's first letter so the result always reads as one grammatical
// sentence whether or not a citation was found — every call site would
// otherwise need its own capitalization branch.
export function withKnowledgeCitation(documents: DigitalDocument[], sentence: string): string {
  const prefix = citeKnowledge(documents);
  if (!prefix) return sentence;
  return prefix + sentence.charAt(0).toLowerCase() + sentence.slice(1);
}
