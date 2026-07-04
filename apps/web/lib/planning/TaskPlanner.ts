import { IMMEDIATE_SCHEDULE, type PlanStep } from "@/lib/planning/PlanTypes";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";

let stepCounter = 0;
function nextTaskStepId(): string {
  stepCounter += 1;
  return `task-${stepCounter}`;
}

// Turns the Reasoning Engine's action items into initial worker-task
// steps for the origin worker. This is the base of the plan before
// collaboration, capability assignment, or workflow steps are added.
export function planTasksFromActions(workerId: string, reasoning: ReasoningResult): PlanStep[] {
  return reasoning.actions.map((action, index) => ({
    id: nextTaskStepId(),
    order: index,
    type: "worker-task",
    title: action.title,
    description: action.description,
    workerId,
    requiresApproval: false,
    priority: action.priority,
    schedule: IMMEDIATE_SCHEDULE,
  }));
}
