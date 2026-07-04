import type { ExecutionTask } from "@/lib/execution/ExecutionTypes";
import { ExecutionEngine } from "@/lib/execution/ExecutionEngine";
import { PlanningEngine, type PlanningResult } from "@/lib/planning/PlanningEngine";
import { RAGService, type RAGResponse } from "@/lib/rag/RAGService";
import { ReasoningEngine } from "@/lib/reasoning/ReasoningEngine";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import { WorkerRouter, type RoutingRequest } from "@/lib/workforce/WorkerRouter";

export interface WorkerRuntimeRequest extends RoutingRequest {
  userMessage: string;
}

export interface WorkerRuntimeResult {
  rag: RAGResponse;
  reasoning: ReasoningResult;
  planning: PlanningResult;
  execution: ExecutionTask;
}

// The complete integrated pipeline this phase's "Integration Rules"
// describe: Runtime -> Worker Router -> Worker Engine (via RAGService) ->
// Prompt -> Memory -> Retrieval -> RAG -> Reasoning -> Planning ->
// Execution -> Worker Response. Every engine below is reused,
// unmodified; this file only sequences the calls in order.
export const WorkerRuntime = {
  async handle(request: WorkerRuntimeRequest): Promise<WorkerRuntimeResult | undefined> {
    const decision = WorkerRouter.route(request);
    if (!decision) return undefined;

    const rag = await RAGService.run({ worker: decision.worker, userMessage: request.userMessage });
    const reasoning = ReasoningEngine.reasonAfterRag(decision.worker, rag);
    const planning = PlanningEngine.plan(decision.worker, request.userMessage, reasoning, rag.knowledgeContext);
    const execution = ExecutionEngine.runAll(planning.plan);

    return { rag, reasoning, planning, execution };
  },
};
