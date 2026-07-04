import { createProviderContext } from "@/lib/llm/ProviderContext";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import { MemoryEngine } from "@/lib/memory/MemoryEngine";
import type { CompiledPrompt } from "@/lib/prompt/PromptTypes";
import { assembleKnowledgeContext } from "@/lib/rag/ContextAssembler";
import { composePrompt } from "@/lib/rag/PromptComposer";
import type { Citation, ContextBudget, KnowledgeContext } from "@/lib/rag/RAGTypes";
import { RetrievalEngine } from "@/lib/retriever/RetrievalEngine";
import type { WorkerInstance } from "@/lib/workforce/Worker";
import type { WorkerContext } from "@/lib/workforce/WorkerContext";
import { WorkerEngine } from "@/lib/workforce/WorkerEngine";

export interface RAGRequest {
  worker: WorkerInstance;
  userMessage: string;
  companyId?: string;
  budget?: ContextBudget;
}

export interface RAGResponse {
  workerId: string;
  answer: string;
  citations: Citation[];
  knowledgeContext: KnowledgeContext;
  compiledPrompt: CompiledPrompt;
  workerContext: WorkerContext;
  providerId: string;
  model: string;
  generatedAt: string;
}

const DEFAULT_COMPANY_ID = "demo-enterprise";

// The complete pipeline: User Request -> Worker Context -> Memory Context
// -> Retrieved Knowledge -> Prompt Assembly -> LLM. Every step reuses an
// existing, unmodified layer; this file only assembles and composes.
export const RAGService = {
  async run(request: RAGRequest): Promise<RAGResponse> {
    const companyId = request.companyId ?? DEFAULT_COMPANY_ID;

    // Worker Context — Worker Engine, reused, unchanged.
    const workerContext = WorkerEngine.prepareContext(request.worker);

    // Memory Context — Memory Engine, reused.
    const memory = MemoryEngine.recall(request.worker.id, companyId);
    const history = MemoryEngine.recentHistory(request.worker.id);

    // Retrieved Knowledge — Retrieval Engine, reused, unchanged. Scoped by
    // the department Worker Context just prepared.
    const searchResults = await RetrievalEngine.search(request.userMessage, {
      department: workerContext.department,
    });

    // Prompt Assembly — new B5 assembly (rank/merge/budget/cite) on top of
    // the existing Prompt Layer for final message composition.
    const knowledgeContext = assembleKnowledgeContext(request.userMessage, searchResults, request.budget);
    const compiledPrompt = composePrompt(request.worker, knowledgeContext, memory, history, request.userMessage);

    // LLM — Provider Layer, reused, provider-agnostic. Never a
    // vendor-specific call.
    const provider = ProviderRegistry.getActive();
    if (!provider) {
      throw new Error("No active LLM provider is registered.");
    }

    const providerResponse = await provider.chat(
      {
        model: provider.listModels()[0]?.id ?? "unknown",
        messages: compiledPrompt.messages,
        workerId: request.worker.id,
      },
      createProviderContext({ workerId: request.worker.id }),
    );

    MemoryEngine.appendUserMessage(request.worker.id, request.userMessage);
    MemoryEngine.appendWorkerMessage(request.worker.id, providerResponse.content);

    return {
      workerId: request.worker.id,
      answer: providerResponse.content,
      citations: knowledgeContext.citations,
      knowledgeContext,
      compiledPrompt,
      workerContext,
      providerId: provider.id,
      model: providerResponse.model,
      generatedAt: providerResponse.generatedAt,
    };
  },
};
