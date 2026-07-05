export type WorkflowStatus =
  | "Draft"
  | "Active"
  | "Paused"
  | "Running"
  | "Completed"
  | "Failed"
  | "Cancelled"
  | "Requires Approval";

export type WorkflowTriggerType =
  | "Manual"
  | "Scheduled"
  | "Event Based"
  | "Worker Recommended"
  | "Approval Required";

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  description: string;
  // Only meaningful for "Scheduled" — architecture only, no scheduler
  // runs this yet (mirrors PlanSchedule in lib/planning/PlanTypes.ts).
  cronExpression?: string;
  // Only meaningful for "Event Based".
  eventName?: string;
}

export interface WorkflowStep {
  id: string;
  order: number;
  name: string;
  description: string;
  // The kind of business action this step performs once it reaches a real
  // integration — mirrors lib/action/ActionTypes.ts's ActionType, kept as
  // a plain string here (not imported) so the Workflow Layer has no
  // compile-time dependency on the Action Layer; only the Action Layer
  // depends on the Workflow Layer (see docs/architecture/workflow-automation.md).
  actionType?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  department: string;
  ownerWorkerId?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  requiresApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStepResult {
  stepId: string;
  status: WorkflowStatus;
  output?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  triggeredBy: string;
  providerId: string;
  stepResults: WorkflowStepResult[];
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// The run's final, top-level outcome — distinct from WorkflowRun itself
// (which also carries in-progress state and per-step results) so a
// caller that only wants "did it work, in one sentence" doesn't have to
// derive that from stepResults every time.
export interface WorkflowResult {
  runId: string;
  success: boolean;
  summary: string;
  completedAt: string;
}
