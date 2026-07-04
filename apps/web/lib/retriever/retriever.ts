import { activeEmbeddingProvider } from "@/lib/embeddings/providers";
import type { KnowledgeIndexEntry, RetrievalContext, SearchResult } from "@/lib/knowledge/types";
import { activeVectorStore } from "@/lib/vector/stores";
import type { RetrievalFilter, Retriever } from "@/lib/retriever/types";

export function createRetriever(
  indexEntries: KnowledgeIndexEntry[],
  chunkContentById: Map<string, string>,
): Retriever {
  function filter(results: SearchResult[], criteria: RetrievalFilter): SearchResult[] {
    return results.filter((result) => {
      const matchesDepartment = !criteria.department || result.metadata.department === criteria.department;
      const matchesCategory = !criteria.category || result.metadata.category === criteria.category;
      return matchesDepartment && matchesCategory;
    });
  }

  function rerank(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => b.score - a.score);
  }

  async function search(query: string, criteria: RetrievalFilter = {}): Promise<SearchResult[]> {
    const queryVector = await activeEmbeddingProvider.embed(query);
    const matches = await activeVectorStore.query(queryVector, 10);

    const results = matches
      .map((match): SearchResult | undefined => {
        const entry = indexEntries.find((candidate) => candidate.vectorId === match.id);
        if (!entry) return undefined;

        return {
          chunkId: entry.chunkId,
          documentId: entry.documentId,
          score: match.score,
          content: chunkContentById.get(entry.chunkId) ?? "",
          metadata: entry.metadata,
        };
      })
      .filter((result): result is SearchResult => Boolean(result));

    return filter(rerank(results), criteria);
  }

  async function retrieve(query: string, criteria: RetrievalFilter = {}): Promise<RetrievalContext> {
    const results = await search(query, criteria);
    return { query, department: criteria.department, results };
  }

  return { search, retrieve, rerank, filter };
}
