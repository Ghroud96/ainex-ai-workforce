import { IMMEDIATE_SCHEDULE, type PlanStep } from "@/lib/planning/PlanTypes";
import { priorityFromLevel } from "@/lib/reasoning/BusinessPriority";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";

let workflowStepCounter = 0;
function nextWorkflowStepId(): string {
  workflowStepCounter += 1;
  return `workflow-${workflowStepCounter}`;
}

// Decides whether an existing Workflow Automation (the worker's own
// availableActions, derived in Sprint 5 from its connected workflows)
// should follow the plan's worker tasks. No workflow is actually
// triggered — see the Execution Engine and "no real workflow execution."
export function planWorkflowStep(
  worker: WorkerInstance,
  reasoning: ReasoningResult,
  startOrder: number,
): PlanStep | null {
  const hasActionableRisk = reasoning.findings.some((finding) => finding.category === "risk");
  const [availableAction] = worker.definition.availableActions;

  if (!hasActionableRisk || !availableAction) {
    return null;
  }

  return {
    id: nextWorkflowStepId(),
    order: startOrder,
    type: "workflow-trigger",
    title: `Prepare optional workflow: ${availableAction.name}`,
    description: availableAction.description,
    workerId: worker.id,
    requiresApproval: true,
    priority: priorityFromLevel("Medium"),
    schedule: IMMEDIATE_SCHEDULE,
  };
}
