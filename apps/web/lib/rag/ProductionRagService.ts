import { lastEmbeddingUsedFallback } from "@/lib/embeddings/providers";
import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import type { ProviderFinishReason } from "@/lib/llm/ProviderResponse";
import type { SearchResult } from "@/lib/knowledge/types";
import { buildCompiledPrompt } from "@/lib/prompt/PromptBuilder";
import { assembleKnowledgeContext } from "@/lib/rag/ContextAssembler";
import type { Citation, KnowledgeContext } from "@/lib/rag/RAGTypes";
import { computeConfidence } from "@/lib/reasoning/ConfidenceScore";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";
import { RetrievalEngine } from "@/lib/retriever/RetrievalEngine";
import { searchDocuments } from "@/lib/services/knowledge/DocumentSearchService";
import type { PromptTemplate } from "@/lib/workforce/WorkerTypes";

// This route has no resolved Digital Worker (see docs/architecture/rag.md
// for why /api/chat is worker-agnostic), so it uses a generic template
// instead of a worker's own PromptTemplate. buildCompiledPrompt (Phase
// B2) only needs the shape below — it doesn't require a registered
// Worker.
const GENERIC_PROMPT_TEMPLATE: PromptTemplate = {
  workerId: "ainex-assistant",
  systemPrompt:
    "You are AINEX, an enterprise assistant for the Digital Workforce platform. Answer business questions using the provided Knowledge Context where it's relevant, and reference a source using its [n] label when you rely on it.",
  instructions: [
    "If the Knowledge Context does not actually answer the question, say so explicitly, then answer from general knowledge instead.",
    "Never present information as company-specific unless it is grounded in the Knowledge Context.",
  ],
};

export interface RelatedDocument {
  documentId: string;
  title: string;
  department: string;
  category: string;
}

export interface ProductionRagResponse {
  answer: string;
  sources: Citation[];
  confidence: ConfidenceScore;
  relatedDocuments: RelatedDocument[];
  hasSufficientKnowledge: boolean;
  safetyMessage: string | null;
  finishReason: ProviderFinishReason;
  providerId: string;
  model: string;
  generatedAt: string;
}

function dedupeByDocumentId(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const deduped: SearchResult[] = [];

  for (const result of results) {
    if (seen.has(result.documentId)) continue;
    seen.add(result.documentId);
    deduped.push(result);
  }

  return deduped;
}

// Merges the two retrieval paths by chunk, keeping whichever scored
// higher for a given chunk. Both are searched unconditionally (not "try
// vector, fall back to keyword only on zero results") because the active
// embedding provider can silently be the mock hash fallback (see
// lib/embeddings/providers.ts) — its cosine similarity is rarely exactly
// zero even for unrelated text, so a real match could otherwise be
// crowded out by a bogus one. See docs/architecture/rag.md.
function mergeSearchResults(vectorResults: SearchResult[], keywordResults: SearchResult[]): SearchResult[] {
  const byChunk = new Map<string, SearchResult>();

  for (const result of [...vectorResults, ...keywordResults]) {
    const existing = byChunk.get(result.chunkId);
    if (!existing || result.score > existing.score) {
      byChunk.set(result.chunkId, result);
    }
  }

  return Array.from(byChunk.values());
}

function buildSafetyMessage(knowledgeContext: KnowledgeContext, confidence: ConfidenceScore): string | null {
  if (knowledgeContext.included.length === 0) {
    return "No relevant company knowledge was found in the Knowledge Hub for this question. The answer below uses general knowledge only and has not been verified against company documents.";
  }
  if (confidence.label === "Low") {
    return "The retrieved company knowledge only weakly matches this question. Treat the answer below as a starting point and verify it against the source documents.";
  }
  return null;
}

function toRelatedDocuments(knowledgeContext: KnowledgeContext, primaryDocumentIds: Set<string>): RelatedDocument[] {
  const candidates = knowledgeContext.excluded
    .map((source) => source.result)
    .filter((result) => !primaryDocumentIds.has(result.documentId));

  return dedupeByDocumentId(candidates).map((result) => ({
    documentId: result.documentId,
    title: result.metadata.title,
    department: result.metadata.department,
    category: result.metadata.category,
  }));
}

// The Production RAG Pipeline (Phase C6): Document -> Chunking ->
// Embedding -> Vector Store -> Retrieval -> Context Assembly -> Prompt
// Engine -> LLM Provider -> Response with Sources. Every stage reuses an
// existing, unmodified layer:
//   - Document/Chunking/Embedding/Vector Store: KnowledgeService,
//     IndexService (unchanged) via RetrievalEngine.
//   - Retrieval: RetrievalEngine (Phase B4, now backed by real-or-mock
//     embeddings and the in-memory vector store), merged with
//     DocumentSearchService's keyword search (Phase C2) for recall.
//   - Context Assembly: assembleKnowledgeContext (Phase B5) — rank,
//     merge, budget, cite.
//   - Prompt Engine: buildCompiledPrompt (Phase B2), fed a generic
//     template since this route has no worker.
//   - LLM Provider: ProviderRegistry.getActive() — provider-agnostic, no
//     vendor-specific code in this file.
// This supersedes Phase C3's BasicRagAdapter, which used keyword search
// only; see docs/architecture/rag.md for the migration note.
export const ProductionRagService = {
  async answer(query: string): Promise<ProductionRagResponse> {
    // Vector search runs first (not in parallel with keyword search) so
    // lastEmbeddingUsedFallback reflects *this* call by the time it's
    // read below. Verified empirically: with the mock hash fallback
    // active, cosine similarity against unrelated mock documents is
    // rarely near zero (0.6-0.9 for a nonsense query is typical) — so a
    // fallback-embedded vector search can't be trusted to correctly
    // report "no relevant knowledge," which would silently break the
    // safety-message/no-source-fallback requirement below. Once real
    // embeddings are available (same OpenAI account/key as chat), this
    // gate opens automatically with no code change.
    const vectorResults = await RetrievalEngine.search(query);
    const usedRealEmbeddings = !lastEmbeddingUsedFallback;
    const keywordResults = searchDocuments(query);
    const combinedResults = usedRealEmbeddings ? mergeSearchResults(vectorResults, keywordResults) : keywordResults;

    const knowledgeContext = assembleKnowledgeContext(query, combinedResults);
    const confidence = computeConfidence(knowledgeContext);
    const safetyMessage = buildSafetyMessage(knowledgeContext, confidence);

    const provider = ProviderRegistry.getActive();
    if (!provider) {
      return {
        answer: "No AI provider is currently available.",
        sources: [],
        confidence,
        relatedDocuments: [],
        hasSufficientKnowledge: false,
        safetyMessage: "AINEX has no active AI provider configured.",
        finishReason: "error",
        providerId: "none",
        model: "unknown",
        generatedAt: new Date().toISOString(),
      };
    }

    const compiledPrompt = buildCompiledPrompt({
      promptTemplate: GENERIC_PROMPT_TEMPLATE,
      knowledge: knowledgeContext.included.map((source) => source.result),
      memory: {},
      history: [],
      userMessage: query,
    });

    const providerResponse = await provider.chat(
      { model: provider.listModels()[0]?.id ?? "unknown", messages: compiledPrompt.messages },
      createProviderContext(),
    );

    const isError = providerResponse.finishReason === "error";
    const primaryDocumentIds = new Set(knowledgeContext.citations.map((citation) => citation.documentId));

    return {
      answer: providerResponse.content,
      sources: isError ? [] : knowledgeContext.citations,
      confidence,
      relatedDocuments: isError ? [] : toRelatedDocuments(knowledgeContext, primaryDocumentIds),
      hasSufficientKnowledge: knowledgeContext.included.length > 0,
      safetyMessage: isError ? null : safetyMessage,
      finishReason: providerResponse.finishReason,
      providerId: provider.id,
      model: providerResponse.model,
      generatedAt: providerResponse.generatedAt,
    };
  },
};
