import type { RetrievalContext, SearchResult } from "@/lib/knowledge/types";
import { getCombinedKnowledgeIndex } from "@/lib/services/knowledge/knowledgeHubBridge";
import { createRetriever } from "@/lib/retriever/retriever";
import type { RetrievalFilter } from "@/lib/retriever/types";
import type { WorkerInstance } from "@/lib/workforce/Worker";

// Sits on top of the existing Sprint 4 pipeline (createRetriever(),
// lib/vector, lib/embeddings, knowledgeHubBridge) rather than rebuilding
// any of it. This is the only new abstraction B4 adds: a combined,
// worker-facing search surface across every ingested document at once,
// instead of one document's index at a time.
export const RetrievalEngine = {
  async search(query: string, filter: RetrievalFilter = {}): Promise<SearchResult[]> {
    const { indexEntries, chunkContentById } = await getCombinedKnowledgeIndex();
    const retriever = createRetriever(indexEntries, chunkContentById);
    return retriever.search(query, filter);
  },

  async retrieve(query: string, filter: RetrievalFilter = {}): Promise<RetrievalContext> {
    const { indexEntries, chunkContentById } = await getCombinedKnowledgeIndex();
    const retriever = createRetriever(indexEntries, chunkContentById);
    return retriever.retrieve(query, filter);
  },

  // Convenience entry point for a specific Digital Worker: scopes the
  // search to the worker's own department so a worker only ever sees
  // knowledge relevant to its function.
  async searchForWorker(worker: WorkerInstance, query: string): Promise<SearchResult[]> {
    return this.search(query, { department: worker.definition.department });
  },
};
