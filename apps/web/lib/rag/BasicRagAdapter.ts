import type { ProviderMessage } from "@/lib/llm/ProviderRequest";
import { searchDocuments } from "@/lib/services/knowledge/DocumentSearchService";
import type { SearchResult } from "@/lib/knowledge/types";

const MAX_SOURCES = 3;

export interface BasicRagContext {
  query: string;
  results: SearchResult[];
}

// A minimal adapter — not the full Phase B WorkerRuntime/RAGService chain
// (Worker Router -> Worker Engine -> RAG Engine), because the generic
// /api/chat route has no resolved WorkerInstance to scope retrieval by.
// See docs/architecture/rag.md for why this exists as its own path
// instead of forcing a worker context that doesn't exist here.
export function buildBasicRagContext(query: string): BasicRagContext {
  return { query, results: searchDocuments(query).slice(0, MAX_SOURCES) };
}

export function buildSystemMessage(context: BasicRagContext): ProviderMessage {
  if (context.results.length === 0) {
    return {
      role: "system",
      content:
        "You are AINEX, an enterprise assistant. No relevant company knowledge was found in the Knowledge Hub for this question. Answer using general knowledge only, and clearly state at the start of your response that no company-specific information was found for this question.",
    };
  }

  const knowledgeText = context.results
    .map((result, index) => `[${index + 1}] ${result.metadata.title} (${result.metadata.department}): ${result.content}`)
    .join("\n\n");

  return {
    role: "system",
    content: `You are AINEX, an enterprise assistant. Answer the user's question using the following company knowledge where it's relevant. Reference a source using its [n] label when you rely on it. If the knowledge below doesn't actually answer the question, say so and answer from general knowledge instead.\n\nCompany Knowledge:\n${knowledgeText}`,
  };
}

// Guarantees source visibility and "no knowledge found" honesty at the
// code level rather than only hoping the model complies with the system
// prompt above.
export function appendSourceFooter(reply: string, context: BasicRagContext): string {
  if (context.results.length === 0) {
    return `${reply}\n\n— No relevant documents were found in the Knowledge Hub for this question.`;
  }

  const sources = context.results.map((result, index) => `[${index + 1}] ${result.metadata.title}`).join(", ");
  return `${reply}\n\n— Sources: ${sources}`;
}
