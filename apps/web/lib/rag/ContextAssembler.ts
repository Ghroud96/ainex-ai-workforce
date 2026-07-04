import type { SearchResult } from "@/lib/knowledge/types";
import { buildCitations } from "@/lib/rag/CitationSupport";
import { mergeChunks } from "@/lib/rag/ChunkMerger";
import { applyBudget, DEFAULT_CONTEXT_BUDGET } from "@/lib/rag/ContextBudgetManager";
import type { ContextBudget, KnowledgeContext } from "@/lib/rag/RAGTypes";
import { rankSources } from "@/lib/rag/SourceRanking";

// Assembly step of the RAG pipeline: raw, already-retrieved SearchResult[]
// (from the unchanged Retrieval Engine) becomes a KnowledgeContext —
// ranked, merged, budgeted, and cited. Every retrieved document's
// metadata survives this step untouched inside each RankedSource.
export function assembleKnowledgeContext(
  query: string,
  results: SearchResult[],
  budget: ContextBudget = DEFAULT_CONTEXT_BUDGET,
): KnowledgeContext {
  const ranked = rankSources(results);
  const merged = mergeChunks(ranked);
  const { included, excluded, charactersUsed } = applyBudget(merged, budget);

  return {
    query,
    included,
    excluded,
    citations: buildCitations(included),
    budget,
    charactersUsed,
  };
}
