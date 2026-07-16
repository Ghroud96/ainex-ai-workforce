import { ActionRegistry } from "@/lib/action/ActionRegistry";
import { ActionService } from "@/lib/action/ActionService";
import type { Action, ActionResult } from "@/lib/action/ActionTypes";
import type { ExecutionTask } from "@/lib/execution/ExecutionTypes";
import { ExecutionEngine } from "@/lib/execution/ExecutionEngine";
import type { WorkerScopedIntelligence } from "@/lib/knowledge-engine/RetrievalService";
import { RetrievalService } from "@/lib/knowledge-engine/RetrievalService";
import { PlanningEngine, type PlanningResult } from "@/lib/planning/PlanningEngine";
import { RAGService, type RAGResponse } from "@/lib/rag/RAGService";
import { ReasoningEngine } from "@/lib/reasoning/ReasoningEngine";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import { RuntimeLogger, type RuntimeLogEntry } from "@/lib/runtime/RuntimeLogger";
import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { WorkflowRun } from "@/lib/workflow/WorkflowTypes";
import { WorkerRouter, type RoutingRequest } from "@/lib/workforce/WorkerRouter";

export interface WorkerRuntimeRequest extends RoutingRequest {
  userMessage: string;
}

export interface WorkerRuntimeResult {
  rag: RAGResponse;
  reasoning: ReasoningResult;
  planning: PlanningResult;
  execution: ExecutionTask;
  actionResult?: ActionResult;
  workflowRun?: WorkflowRun;
  logs: RuntimeLogEntry[];
  // Additive, Phase C10 (Capability 11) — the worker-scoped slice of
  // persisted Company Intelligence, read alongside the existing RAG
  // call. Optional and unread by every existing caller (the Intelligence
  // page doesn't consume it yet — wiring it into UI is out of scope for
  // this capability); this field is a true no-op for anything already
  // depending on WorkerRuntimeResult.
  companyIntelligence?: WorkerScopedIntelligence;
}

// The complete integrated pipeline: Runtime -> Worker Router -> Worker
// Engine (via RAGService) -> Prompt -> Memory -> Retrieval -> RAG ->
// Reasoning -> Planning -> Execution -> Action Layer -> Workflow Layer ->
// n8n Provider -> Runtime Logger -> Worker Response (Phase C7-C9 adds the
// Action/Workflow/Logger stages; Phase C10 adds the additive
// RetrievalService/Company Intelligence read alongside RAGService;
// everything before Execution is otherwise reused, unmodified).
export const WorkerRuntime = {
  async handle(request: WorkerRuntimeRequest): Promise<WorkerRuntimeResult | undefined> {
    const decision = WorkerRouter.route(request);
    if (!decision) return undefined;
    const workerId = decision.worker.id;

    RuntimeLogger.log(workerId, "Knowledge", `Retrieved knowledge context for "${request.userMessage}".`);
    const rag = await RAGService.run({ worker: decision.worker, userMessage: request.userMessage });
    const { structured: companyIntelligence } = await RetrievalService.forWorker(workerId, request.userMessage);

    RuntimeLogger.log(workerId, "Reasoning", "Evaluated retrieved knowledge for risks, opportunities, and anomalies.");
    const reasoning = ReasoningEngine.reasonAfterRag(decision.worker, rag);

    RuntimeLogger.log(workerId, "Decision", "Planning Engine produced a plan from the reasoning result.");
    const planning = PlanningEngine.plan(decision.worker, request.userMessage, reasoning, rag.knowledgeContext);
    const execution = ExecutionEngine.runAll(planning.plan);

    // Action Layer -> Workflow Layer -> n8n Provider -> Workflow Run: only
    // exercised when the Planning Engine actually produced a
    // workflow-trigger step (WorkflowPlanner, Phase B7) and a workflow is
    // registered for this worker (WorkflowRegistry, Phase C7) — otherwise
    // there is nothing to trigger, and both fields stay undefined rather
    // than fabricating an action that wasn't planned.
    let actionResult: ActionResult | undefined;
    let workflowRun: WorkflowRun | undefined;
    const workflowStep = planning.plan.steps.find((step) => step.type === "workflow-trigger");
    const recommendedWorkflow = WorkflowService.recommendedForWorker(workerId)[0];

    if (workflowStep && recommendedWorkflow) {
      RuntimeLogger.log(workerId, "Action", `Requesting "Trigger Workflow" action for "${recommendedWorkflow.name}".`);

      // Registered per-worker (not looked up from the mock Action
      // Library in data/actions.ts) because this action is synthesized
      // for this specific request rather than a fixed library entry.
      // requiresApproval is deliberately false here, not
      // workflowStep.requiresApproval: approval belongs to the workflow
      // being triggered (WorkflowService.trigger() already gates on
      // Workflow.requiresApproval and produces a "Requires Approval" run
      // instead of executing) — gating at the action level too would
      // stop the request before it ever reaches the Workflow Layer, and
      // no WorkflowRun would be recorded for the UI to show.
      const triggerAction: Action = {
        id: `runtime-trigger-workflow-${workerId}`,
        type: "Trigger Workflow",
        name: "Trigger Recommended Workflow",
        description: "Runtime-initiated workflow trigger.",
        requiresApproval: false,
        workerIds: [workerId],
      };
      ActionRegistry.register(triggerAction);

      const actionRequest = ActionService.request({
        actionId: triggerAction.id,
        workerId,
        input: { workflowId: recommendedWorkflow.id },
      });
      actionResult = await ActionService.execute(actionRequest);
      if (actionResult.workflowRunId) {
        workflowRun = await WorkflowService.getRun(actionResult.workflowRunId);
      }
      RuntimeLogger.log(workerId, "Action", `Action result: ${actionResult.status}.`);
    }

    RuntimeLogger.log(workerId, "Learning", "Conversation and knowledge usage recorded to Memory Engine.");
    RuntimeLogger.log(workerId, "Reporting", "Runtime pipeline completed.");

    return { rag, reasoning, planning, execution, actionResult, workflowRun, logs: RuntimeLogger.getForWorker(workerId), companyIntelligence };
  },
};
