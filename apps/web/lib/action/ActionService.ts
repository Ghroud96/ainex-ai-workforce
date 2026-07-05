import { actionApprovalStore } from "@/lib/action/ActionApproval";
import { actionAuditLog } from "@/lib/action/ActionAuditLog";
import { mockActionExecutor } from "@/lib/action/ActionExecutor";
import { ActionRegistry } from "@/lib/action/ActionRegistry";
import type { Action, ActionRequest, ActionResult } from "@/lib/action/ActionTypes";

let requestCounter = 0;
function nextRequestId(): string {
  requestCounter += 1;
  return `action-request-${requestCounter}`;
}

export interface RequestActionInput {
  actionId: string;
  workerId: string;
  input?: Record<string, unknown>;
}

// The one seam UI code and the Runtime are allowed to call — neither
// touches ActionRegistry, ActionExecutor, ActionApproval, or
// ActionAuditLog directly. Mirrors WorkflowService's role for the
// Workflow Layer.
export const ActionService = {
  listForWorker(workerId: string): Action[] {
    return ActionRegistry.getForWorker(workerId);
  },

  request(input: RequestActionInput): ActionRequest {
    return {
      id: nextRequestId(),
      actionId: input.actionId,
      workerId: input.workerId,
      input: input.input ?? {},
      requestedAt: new Date().toISOString(),
    };
  },

  // Approval-gated the same way WorkflowService.trigger() is: an action
  // whose Action.requiresApproval is true never reaches the executor
  // until approve() grants it.
  async execute(request: ActionRequest): Promise<ActionResult> {
    const action = ActionRegistry.getById(request.actionId);
    if (!action) {
      const result: ActionResult = { requestId: request.id, status: "Failed", error: `No action registered with id "${request.actionId}".` };
      actionAuditLog.record({ actionRequestId: request.id, actionId: request.actionId, workerId: request.workerId, status: result.status, detail: result.error ?? "" });
      return result;
    }

    if (action.requiresApproval) {
      const approval = actionApprovalStore.request(request.id, `Approval required for: ${action.name}`);

      if (approval.status === "pending") {
        const result: ActionResult = { requestId: request.id, status: "Waiting Approval" };
        actionAuditLog.record({ actionRequestId: request.id, actionId: action.id, workerId: request.workerId, status: result.status, detail: "Awaiting human approval." });
        return result;
      }

      if (approval.status === "rejected") {
        const result: ActionResult = { requestId: request.id, status: "Cancelled", error: "Approval was rejected.", completedAt: new Date().toISOString() };
        actionAuditLog.record({ actionRequestId: request.id, actionId: action.id, workerId: request.workerId, status: result.status, detail: "Approval was rejected." });
        return result;
      }
      // approved — fall through to execution.
    }

    const result = await mockActionExecutor.execute(request, action);
    actionAuditLog.record({
      actionRequestId: request.id,
      actionId: action.id,
      workerId: request.workerId,
      status: result.status,
      detail: result.output ?? result.error ?? "",
    });
    return result;
  },

  approve(actionRequestId: string, approved: boolean) {
    const approval = actionApprovalStore.getByActionRequest(actionRequestId);
    if (!approval) return undefined;
    return actionApprovalStore.decide(approval.id, approved);
  },

  auditFor(workerId: string) {
    return actionAuditLog.getByWorker(workerId);
  },
};
