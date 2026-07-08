import { N8nWorkflowProvider } from "@/lib/workflow/n8n/N8nWorkflowProvider";
import { WorkflowRegistry } from "@/lib/workflow/WorkflowRegistry";
import { workflowRunStore } from "@/lib/workflow/WorkflowRunStore";
import type { Workflow, WorkflowRun } from "@/lib/workflow/WorkflowTypes";
import type { WorkflowProvider } from "@/lib/workflow/WorkflowProvider";
import { WorkflowRunEngine } from "@/lib/workflow/run/WorkflowRunEngine";

// The only active WorkflowProvider today (see
// docs/architecture/n8n-integration.md for why there's one implementation,
// not a real/mock pair). Swapping this line is the entire activation
// cost of a future second provider — no caller of WorkflowService changes.
const activeProvider: WorkflowProvider = N8nWorkflowProvider;

export interface TriggerWorkflowRequest {
  workflowId: string;
  triggeredBy: string;
  approved?: boolean;
  input?: Record<string, unknown>;
}

// The one seam UI code and worker logic are allowed to call — neither
// ever imports lib/workflow/n8n directly. This is what satisfies "AINEX
// must never depend directly on n8n inside UI or worker logic."
export const WorkflowService = {
  library(): Workflow[] {
    return WorkflowRegistry.getAll();
  },

  getById(id: string): Workflow | undefined {
    return WorkflowRegistry.getById(id);
  },

  recommendedForWorker(workerId: string): Workflow[] {
    const worker = WorkflowRegistry.getByOwnerWorker(workerId);
    if (worker.length > 0) return worker;

    return [];
  },

  scheduled(): Workflow[] {
    return WorkflowRegistry.getScheduled();
  },

  runHistory(workflowId?: string): WorkflowRun[] {
    return workflowId ? workflowRunStore.getByWorkflow(workflowId) : workflowRunStore.getAll();
  },

  runHistoryForWorker(workerId: string): WorkflowRun[] {
    const workflowIds = new Set(WorkflowRegistry.getByOwnerWorker(workerId).map((workflow) => workflow.id));
    return workflowRunStore.getAll().filter((run) => workflowIds.has(run.workflowId));
  },

  failedRuns(): WorkflowRun[] {
    return workflowRunStore.getByStatus("Failed");
  },

  approvalsRequired(): WorkflowRun[] {
    return workflowRunStore.getByStatus("Requires Approval");
  },

  approvalsRequiredForWorker(workerId: string): WorkflowRun[] {
    const workflowIds = new Set(WorkflowRegistry.getByOwnerWorker(workerId).map((workflow) => workflow.id));
    return workflowRunStore.getByStatus("Requires Approval").filter((run) => workflowIds.has(run.workflowId));
  },

  // Approval-gated: a workflow that requires approval never reaches the
  // provider until context.approved is true — mirroring
  // ExecutionGuardrail's "a step requiring approval cannot execute until
  // that approval is granted" rule, applied at the Workflow Layer instead
  // of the Execution Engine.
  async trigger(request: TriggerWorkflowRequest): Promise<WorkflowRun> {
    const workflow = WorkflowRegistry.getById(request.workflowId);
    if (!workflow) {
      throw new Error(`No workflow registered with id "${request.workflowId}".`);
    }

    if (workflow.requiresApproval && !request.approved) {
      const run = WorkflowRunEngine.run({
        workflow,
        triggeredBy: request.triggeredBy,
        approved: false,
        providerId: activeProvider.id,
        input: request.input,
      });
      return workflowRunStore.save(run);
    }

    return activeProvider.trigger(workflow, {
      triggeredBy: request.triggeredBy,
      approved: request.approved,
      input: request.input,
    });
  },

  async getRun(runId: string): Promise<WorkflowRun | undefined> {
    return activeProvider.getRun(runId);
  },

  async cancelRun(runId: string): Promise<void> {
    return activeProvider.cancel(runId);
  },
};
