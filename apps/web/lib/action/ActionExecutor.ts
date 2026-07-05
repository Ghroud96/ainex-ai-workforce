import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { WorkflowStatus } from "@/lib/workflow/WorkflowTypes";
import type { Action, ActionRequest, ActionResult, ActionStatus } from "@/lib/action/ActionTypes";

export interface ActionExecutor {
  execute(request: ActionRequest, action: Action): Promise<ActionResult>;
}

// WorkflowStatus (8 values, includes Draft/Active/Paused — a workflow
// definition's own lifecycle) and ActionStatus (7 values, an
// ExecutionStatus alias — a single invocation's outcome) are different
// enums for different things. A "Trigger Workflow" action's result
// status is the closest ActionStatus equivalent of the WorkflowRun it
// produced, not the same type.
function toActionStatus(status: WorkflowStatus): ActionStatus {
  switch (status) {
    case "Requires Approval":
      return "Waiting Approval";
    case "Running":
    case "Completed":
    case "Failed":
    case "Cancelled":
      return status;
    case "Draft":
    case "Active":
    case "Paused":
      return "Pending";
  }
}

function mockOutputFor(action: Action, request: ActionRequest): string {
  switch (action.type) {
    case "Send Email":
      return `[Mock] Email sent for "${action.name}".`;
    case "Send WhatsApp":
      return `[Mock] WhatsApp message sent for "${action.name}".`;
    case "Create Task":
      return `[Mock] Task created for "${action.name}".`;
    case "Generate Report":
      return `[Mock] Report generated for "${action.name}".`;
    case "Create Reminder":
      return `[Mock] Reminder created for "${action.name}".`;
    case "Update CRM":
      return `[Mock] CRM record updated for "${action.name}".`;
    case "Create Invoice":
      return `[Mock] Invoice created for "${action.name}".`;
    case "Notify Manager":
      return `[Mock] Manager notified for "${action.name}".`;
    case "Request Approval":
      return `[Mock] Approval requested for "${action.name}".`;
    default:
      return `[Mock] "${action.name}" completed by ${request.workerId}.`;
  }
}

// The one ActionExecutor implementation. Every ActionType except
// "Trigger Workflow" is a deterministic mock — no real integration is
// called (this phase explicitly excludes real ERP/CRM). "Trigger
// Workflow" is the one type that's genuinely wired end-to-end: it calls
// WorkflowService.trigger(), the same Workflow Layer entry point the UI
// uses, so an action of this type is a real (mock-backed) bridge from
// the Action Layer into the Workflow Layer — see
// docs/architecture/action-execution.md and the architecture flow in
// docs/architecture/workflow-automation.md.
export const mockActionExecutor: ActionExecutor = {
  async execute(request: ActionRequest, action: Action): Promise<ActionResult> {
    const completedAt = new Date().toISOString();

    if (action.type === "Trigger Workflow") {
      const workflowId = request.input.workflowId as string | undefined;
      if (!workflowId) {
        return { requestId: request.id, status: "Failed", error: "No workflowId provided in the action request.", completedAt };
      }

      try {
        const run = await WorkflowService.trigger({
          workflowId,
          triggeredBy: request.workerId,
          approved: request.input.approved as boolean | undefined,
        });

        return {
          requestId: request.id,
          status: toActionStatus(run.status),
          output: `Triggered workflow "${workflowId}" — run ${run.id} (${run.status}).`,
          workflowRunId: run.id,
          completedAt,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Workflow trigger failed.";
        return { requestId: request.id, status: "Failed", error: message, completedAt };
      }
    }

    return { requestId: request.id, status: "Completed", output: mockOutputFor(action, request), completedAt };
  },
};
