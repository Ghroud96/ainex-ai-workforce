import type { PlanStep } from "@/lib/planning/PlanTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";

// A worker-task step created from a Reasoning Engine action is inherently
// an enactment of "Recommend Actions" — assign that capability if the
// worker has it, otherwise fall back to the worker's first registered
// capability. Steps that already carry a capabilityId are left alone.
export function assignCapabilities(steps: PlanStep[], workers: Map<string, WorkerInstance>): PlanStep[] {
  return steps.map((step) => {
    if (step.capabilityId || step.type !== "worker-task" || !step.workerId) {
      return step;
    }

    const worker = workers.get(step.workerId);
    if (!worker) return step;

    const capabilityId = worker.hasCapability("recommend-actions")
      ? "recommend-actions"
      : worker.definition.capabilities[0]?.id;

    return { ...step, capabilityId };
  });
}
