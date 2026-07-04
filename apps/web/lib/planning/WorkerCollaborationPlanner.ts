import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import { priorityFromLevel } from "@/lib/reasoning/BusinessPriority";
import { IMMEDIATE_SCHEDULE, type PlanStep } from "@/lib/planning/PlanTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";
import { WorkerRegistry } from "@/lib/workforce/WorkerRegistry";

let collaborationStepCounter = 0;
function nextCollaborationStepId(): string {
  collaborationStepCounter += 1;
  return `collab-${collaborationStepCounter}`;
}

// Deterministic, department-based suggestion: if the knowledge retrieved
// for this request touches a department other than the origin worker's
// own, the worker who owns that department is suggested as a
// collaborator. No worker is actually invoked — this only identifies who
// *should* be asked, per "do not connect real workers yet."
export function suggestCollaborators(origin: WorkerInstance, knowledgeContext: KnowledgeContext): WorkerInstance[] {
  const otherDepartments = new Set(
    knowledgeContext.included
      .map((source) => source.result.metadata.department)
      .filter((department) => department !== origin.definition.department),
  );

  const collaborators: WorkerInstance[] = [];

  for (const department of otherDepartments) {
    const [candidate] = WorkerRegistry.getByDepartment(department);
    if (candidate && candidate.id !== origin.id) {
      collaborators.push(candidate);
    }
  }

  return collaborators;
}

export function buildCollaborationSteps(
  collaborators: WorkerInstance[],
  goal: string,
  startOrder: number,
): PlanStep[] {
  return collaborators.map((worker, index) => ({
    id: nextCollaborationStepId(),
    order: startOrder + index,
    type: "worker-task",
    title: `Ask ${worker.name} to review`,
    description: `${worker.name} reviews "${goal}" from the ${worker.definition.department} perspective.`,
    workerId: worker.id,
    requiresApproval: false,
    priority: priorityFromLevel("Medium"),
    schedule: IMMEDIATE_SCHEDULE,
  }));
}
