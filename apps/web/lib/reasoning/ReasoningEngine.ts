import type { RAGResponse } from "@/lib/rag/RAGService";
import {
  defaultReasoningStrategy,
  type ReasoningInput,
  type ReasoningStrategy,
} from "@/lib/reasoning/ReasoningStrategy";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";

const strategies = new Map<string, ReasoningStrategy>([[defaultReasoningStrategy.id, defaultReasoningStrategy]]);

// Every Digital Worker passes through this engine before a final response
// is considered complete. Strategies are pluggable and registrable —
// hosting more than one reasoning approach requires no change here.
export const ReasoningEngine = {
  registerStrategy(strategy: ReasoningStrategy): void {
    strategies.set(strategy.id, strategy);
  },

  listStrategies(): ReasoningStrategy[] {
    return Array.from(strategies.values());
  },

  reason(input: ReasoningInput, strategyId: string = defaultReasoningStrategy.id): ReasoningResult {
    const strategy = strategies.get(strategyId) ?? defaultReasoningStrategy;
    return strategy.run(input);
  },

  // Convenience entry point for the common case: reasoning immediately
  // after a RAGService.run() call, using the context it already built.
  reasonAfterRag(
    worker: WorkerInstance,
    ragResponse: Pick<RAGResponse, "workerContext" | "knowledgeContext">,
    strategyId?: string,
  ): ReasoningResult {
    return this.reason(
      { worker, workerContext: ragResponse.workerContext, knowledgeContext: ragResponse.knowledgeContext },
      strategyId,
    );
  },
};
