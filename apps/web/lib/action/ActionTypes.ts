import type { ExecutionStatus } from "@/lib/execution/ExecutionTypes";

export type ActionType =
  | "Send Email"
  | "Send WhatsApp"
  | "Create Task"
  | "Generate Report"
  | "Trigger Workflow"
  | "Create Reminder"
  | "Update CRM"
  | "Create Invoice"
  | "Notify Manager"
  | "Request Approval";

// The same seven statuses the Execution Engine already defined
// (lib/execution/ExecutionTypes.ts) — a type alias, not a redefinition,
// so a status check works identically across both layers and there's
// exactly one list of execution-style statuses in the codebase.
export type ActionStatus = ExecutionStatus;

// A registered, reusable action a Digital Worker can take — not a
// specific invocation. Mirrors Capability (lib/workforce/WorkerTypes.ts)
// in shape: id/name/description plus what makes an action distinct
// (type, approval requirement, which workers can use it).
export interface Action {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  requiresApproval: boolean;
  workerIds: string[];
}

export interface ActionRequest {
  id: string;
  actionId: string;
  workerId: string;
  input: Record<string, unknown>;
  requestedAt: string;
}

export interface ActionResult {
  requestId: string;
  status: ActionStatus;
  output?: string;
  error?: string;
  // Only set when the underlying Action.type is "Trigger Workflow" — the
  // id of the WorkflowRun the Action Layer's execution produced, so a
  // caller can look up full workflow detail via WorkflowService.getRun()
  // without ActionResult needing to import lib/workflow's types.
  workflowRunId?: string;
  completedAt?: string;
}
