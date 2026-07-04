import type { SearchResult } from "@/lib/knowledge/types";
import type { RankedSource } from "@/lib/rag/RAGTypes";

// The Retrieval Engine already scores and reranks results by cosine
// similarity (lib/retriever/retriever.ts's rerank()). This adds one
// business-level secondary signal on top — document status — rather than
// recomputing similarity. "Indexed" documents rank slightly above
// "Archived" ones with an otherwise-equal score.
const STATUS_BOOST: Record<string, number> = {
  Indexed: 0.05,
  Archived: 0,
};

export function rankSources(results: SearchResult[]): RankedSource[] {
  const adjusted = results.map((result) => ({
    result,
    adjustedScore: result.score + (STATUS_BOOST[result.metadata.status] ?? 0),
  }));

  adjusted.sort((a, b) => b.adjustedScore - a.adjustedScore);

  return adjusted.map((entry, index) => ({
    result: entry.result,
    rank: index + 1,
    mergedFrom: 1,
  }));
}
