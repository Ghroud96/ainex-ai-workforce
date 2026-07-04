import type { Citation, RankedSource } from "@/lib/rag/RAGTypes";

// Every response can reference its sources: this builds the numbered
// citation list from whichever sources actually made it into the
// context (post-ranking, merging, and budgeting).
export function buildCitations(sources: RankedSource[]): Citation[] {
  return sources.map((source, index) => ({
    label: `[${index + 1}]`,
    documentId: source.result.documentId,
    title: source.result.metadata.title,
    department: source.result.metadata.department,
  }));
}
