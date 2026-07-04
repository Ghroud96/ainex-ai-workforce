import type { ExecutionTask } from "@/lib/execution/ExecutionTypes";

export interface ExecutionReport {
  taskId: string;
  summary: string;
  completedSteps: number;
  failedSteps: number;
  pendingApprovalSteps: number;
  totalSteps: number;
}

export function buildExecutionReport(task: ExecutionTask): ExecutionReport {
  const completedSteps = task.steps.filter((step) => step.status === "Completed").length;
  const failedSteps = task.steps.filter((step) => step.status === "Failed").length;
  const pendingApprovalSteps = task.steps.filter((step) => step.status === "Waiting Approval").length;

  const summary =
    task.status === "Completed"
      ? `All ${task.steps.length} step${task.steps.length === 1 ? "" : "s"} completed successfully.`
      : `${completedSteps} of ${task.steps.length} step${task.steps.length === 1 ? "" : "s"} completed` +
        (failedSteps > 0 ? `, ${failedSteps} failed` : "") +
        (pendingApprovalSteps > 0 ? `, ${pendingApprovalSteps} awaiting approval` : "") +
        ".";

  return {
    taskId: task.id,
    summary,
    completedSteps,
    failedSteps,
    pendingApprovalSteps,
    totalSteps: task.steps.length,
  };
}
