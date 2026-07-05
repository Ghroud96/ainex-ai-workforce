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
      const matchesDocumentId = !criteria.documentId || result.documentId === criteria.documentId;
      return matchesDepartment && matchesCategory && matchesDocumentId;
    });
  }

  function rerank(results: SearchResult[]): SearchResult[] {
    return [...results].sort((a, b) => b.score - a.score);
  }

  async function search(query: string, criteria: RetrievalFilter = {}): Promise<SearchResult[]> {
    const queryVector = await activeEmbeddingProvider.embed(query);
    // Filtering happens twice: once inside the vector store (Phase C5 —
    // real stores like Qdrant filter server-side before scoring, which is
    // both faster and what "filter by X" means for a real vector
    // database), and again below on the mapped SearchResult[] as a
    // store-independent safety net (workerId isn't a SearchResult field
    // today, so it's vector-store-only; department/category/documentId
    // are checked both places).
    const matches = await activeVectorStore.query(queryVector, 10, {
      department: criteria.department,
      category: criteria.category,
      documentId: criteria.documentId,
      workerId: criteria.workerId,
    });

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
