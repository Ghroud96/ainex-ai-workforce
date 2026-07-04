import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import { assignCapabilities } from "@/lib/planning/CapabilityPlanner";
import type { Plan } from "@/lib/planning/PlanTypes";
import { planTasksFromActions } from "@/lib/planning/TaskPlanner";
import { buildCollaborationSteps, suggestCollaborators } from "@/lib/planning/WorkerCollaborationPlanner";
import { prioritizeSteps } from "@/lib/planning/PriorityPlanner";
import { planWorkflowStep } from "@/lib/planning/WorkflowPlanner";
import type { WorkerInstance } from "@/lib/workforce/Worker";

let planCounter = 0;
function nextPlanId(): string {
  planCounter += 1;
  return `plan-${planCounter}`;
}

// Final assembly step: runs every planner in order and produces one
// coherent Plan ready for validation, risk assessment, and execution.
export function buildExecutionPlan(
  worker: WorkerInstance,
  goal: string,
  reasoning: ReasoningResult,
  knowledgeContext: KnowledgeContext,
): Plan {
  const taskSteps = planTasksFromActions(worker.id, reasoning);
  const collaborators = suggestCollaborators(worker, knowledgeContext);
  const collaborationSteps = buildCollaborationSteps(collaborators, goal, taskSteps.length);
  const workflowStep = planWorkflowStep(worker, reasoning, taskSteps.length + collaborationSteps.length);

  const involvedWorkers = new Map<string, WorkerInstance>([[worker.id, worker]]);
  for (const collaborator of collaborators) {
    involvedWorkers.set(collaborator.id, collaborator);
  }

  const rawSteps = [...taskSteps, ...collaborationSteps, ...(workflowStep ? [workflowStep] : [])];
  const withCapabilities = assignCapabilities(rawSteps, involvedWorkers);
  const prioritized = prioritizeSteps(withCapabilities);

  return {
    id: nextPlanId(),
    goal,
    originWorkerId: worker.id,
    collaboratingWorkerIds: collaborators.map((collaborator) => collaborator.id),
    steps: prioritized,
    requiresWorkflow: Boolean(workflowStep),
    requiresHumanApproval: prioritized.some((step) => step.requiresApproval),
    createdAt: new Date().toISOString(),
  };
}
