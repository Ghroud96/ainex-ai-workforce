import { createRetriever } from "@/lib/retriever/retriever";
import type { KnowledgeIndexEntry, RetrievalContext } from "@/lib/knowledge/types";
import type { RetrievalFilter } from "@/lib/retriever/types";

export const RetrievalService = {
  query(
    indexEntries: KnowledgeIndexEntry[],
    chunkContentById: Map<string, string>,
    query: string,
    filter: RetrievalFilter = {},
  ): Promise<RetrievalContext> {
    const retriever = createRetriever(indexEntries, chunkContentById);
    return retriever.retrieve(query, filter);
  },
};
