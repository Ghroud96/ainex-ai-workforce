import { MemoryEngine } from "@/lib/memory/MemoryEngine";
import { buildCompiledPrompt } from "@/lib/prompt/PromptBuilder";
import type { CompiledPrompt } from "@/lib/prompt/PromptTypes";
import { RetrievalEngine } from "@/lib/retriever/RetrievalEngine";
import type { WorkerInstance } from "@/lib/workforce/Worker";

export interface PromptEngineOptions {
  companyId?: string;
  skipRetrieval?: boolean;
}

const DEFAULT_COMPANY_ID = "demo-enterprise";

// The integration point: Retrieval -> Memory -> Prompt, as one pipeline,
// for any Digital Worker. Nothing here is worker-specific — the same
// path runs for every worker in the registry. Worker Engine is
// deliberately not touched; this is what a future phase wires it to.
export const PromptEngine = {
  async compileForWorker(
    worker: WorkerInstance,
    userMessage: string,
    options: PromptEngineOptions = {},
  ): Promise<CompiledPrompt> {
    const companyId = options.companyId ?? DEFAULT_COMPANY_ID;

    const knowledge = options.skipRetrieval
      ? []
      : await RetrievalEngine.searchForWorker(worker, userMessage);

    const memory = MemoryEngine.recall(worker.id, companyId);
    const history = MemoryEngine.recentHistory(worker.id);

    const compiled = buildCompiledPrompt({
      promptTemplate: worker.definition.promptTemplate,
      knowledge,
      memory,
      history,
      userMessage,
    });

    MemoryEngine.appendUserMessage(worker.id, userMessage);

    return compiled;
  },
};
