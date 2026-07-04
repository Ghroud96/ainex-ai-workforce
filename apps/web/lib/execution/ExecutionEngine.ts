import { createExecutionError } from "@/lib/execution/ExecutionError";
import { checkGuardrails } from "@/lib/execution/ExecutionGuardrail";
import { approvalStore } from "@/lib/execution/ExecutionApproval";
import type { ExecutionStatus, ExecutionStep, ExecutionTask, ExecutionTimelineEntry } from "@/lib/execution/ExecutionTypes";
import type { Plan, PlanStep } from "@/lib/planning/PlanTypes";

const MAX_ATTEMPTS = 3;

let taskCounter = 0;
function nextTaskId(): string {
  taskCounter += 1;
  return `execution-${taskCounter}`;
}

function timelineEntry(stepId: string, status: ExecutionStatus, message: string): ExecutionTimelineEntry {
  return { timestamp: new Date().toISOString(), stepId, status, message };
}

function deriveTaskStatus(steps: ExecutionStep[]): ExecutionStatus {
  if (steps.some((step) => step.status === "Failed")) return "Failed";
  if (steps.some((step) => step.status === "Waiting Approval")) return "Waiting Approval";
  if (steps.some((step) => step.status === "Pending" || step.status === "Running")) return "Pending";
  if (steps.every((step) => step.status === "Completed" || step.status === "Skipped" || step.status === "Cancelled")) {
    return "Completed";
  }
  return "Pending";
}

// A deterministic mock "run" — no real worker, LLM, workflow, or
// integration is called. This is the placeholder every real execution
// path (n8n, a tool call, an integration) will eventually replace,
// without changing ExecutionStep's shape.
function executeStep(step: PlanStep): ExecutionStep {
  const guardrail = checkGuardrails(step);

  if (!guardrail.allowed) {
    return {
      id: `exec-${step.id}`,
      planStepId: step.id,
      status: guardrail.waitingApproval ? "Waiting Approval" : "Skipped",
      attempt: 0,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  const startedAt = new Date().toISOString();
  const completedAt = new Date().toISOString();

  return {
    id: `exec-${step.id}`,
    planStepId: step.id,
    status: "Completed",
    attempt: 1,
    maxAttempts: MAX_ATTEMPTS,
    startedAt,
    completedAt,
    result: {
      output: `[Mock] "${step.title}" completed${step.workerId ? ` by ${step.workerId}` : ""}${
        step.capabilityId ? ` using ${step.capabilityId}` : ""
      }.`,
      success: true,
      completedAt,
    },
  };
}

export const ExecutionEngine = {
  // Queues a plan without running any step — every step starts "Pending."
  enqueue(plan: Plan): ExecutionTask {
    const steps: ExecutionStep[] = plan.steps.map((step) => ({
      id: `exec-${step.id}`,
      planStepId: step.id,
      status: "Pending",
      attempt: 0,
      maxAttempts: MAX_ATTEMPTS,
    }));

    return {
      id: nextTaskId(),
      planId: plan.id,
      status: deriveTaskStatus(steps),
      steps,
      timeline: [timelineEntry("task", "Pending", `Plan "${plan.goal}" queued with ${steps.length} step(s).`)],
      createdAt: new Date().toISOString(),
    };
  },

  // Executes the next Pending step, in plan order.
  processNext(plan: Plan, task: ExecutionTask): ExecutionTask {
    const nextIndex = task.steps.findIndex((step) => step.status === "Pending");
    if (nextIndex === -1) return task;

    const planStep = plan.steps.find((step) => step.id === task.steps[nextIndex].planStepId);
    if (!planStep) return task;

    const executed = executeStep(planStep);
    const steps = [...task.steps];
    steps[nextIndex] = executed;

    const timeline = [
      ...task.timeline,
      timelineEntry(planStep.id, executed.status, `${planStep.title}: ${executed.status}`),
    ];
    const status = deriveTaskStatus(steps);

    return { ...task, steps, timeline, status, completedAt: status === "Completed" ? new Date().toISOString() : task.completedAt };
  },

  // Convenience: enqueues (if no task given) and processes every step
  // until none remain Pending. Bounded so a stuck step can't infinite-loop.
  runAll(plan: Plan, initialTask?: ExecutionTask): ExecutionTask {
    let task = initialTask ?? this.enqueue(plan);
    let guard = 0;

    while (task.steps.some((step) => step.status === "Pending") && guard <= plan.steps.length) {
      task = this.processNext(plan, task);
      guard += 1;
    }

    return task;
  },

  retry(task: ExecutionTask, planStepId: string): ExecutionTask {
    const index = task.steps.findIndex((step) => step.planStepId === planStepId);
    if (index === -1) return task;

    const existing = task.steps[index];
    if (existing.status !== "Failed" || existing.attempt >= existing.maxAttempts) {
      return task;
    }

    const completedAt = new Date().toISOString();
    const retried: ExecutionStep = {
      ...existing,
      attempt: existing.attempt + 1,
      status: "Completed",
      completedAt,
      result: { output: "[Mock] Retried and completed.", success: true, completedAt },
      error: undefined,
    };

    const steps = [...task.steps];
    steps[index] = retried;

    const timeline = [...task.timeline, timelineEntry(planStepId, retried.status, `Retry succeeded (attempt ${retried.attempt}).`)];

    return { ...task, steps, timeline, status: deriveTaskStatus(steps) };
  },

  approve(plan: Plan, task: ExecutionTask, planStepId: string, approved: boolean): ExecutionTask {
    const request = approvalStore.getByPlanStep(planStepId);
    if (request) {
      approvalStore.decide(request.id, approved);
    }

    const planStep = plan.steps.find((step) => step.id === planStepId);
    if (!planStep) return task;

    const reExecuted = approved
      ? executeStep(planStep)
      : ({
          id: `exec-${planStep.id}`,
          planStepId: planStep.id,
          status: "Cancelled",
          attempt: 0,
          maxAttempts: MAX_ATTEMPTS,
        } satisfies ExecutionStep);

    const steps = task.steps.map((step) => (step.planStepId === planStepId ? reExecuted : step));
    const timeline = [
      ...task.timeline,
      timelineEntry(planStepId, reExecuted.status, approved ? "Approved and executed." : "Approval rejected."),
    ];
    const status = deriveTaskStatus(steps);

    return { ...task, steps, timeline, status, completedAt: status === "Completed" ? new Date().toISOString() : task.completedAt };
  },

  cancel(task: ExecutionTask, planStepId: string): ExecutionTask {
    const steps = task.steps.map((step) =>
      step.planStepId === planStepId ? { ...step, status: "Cancelled" as const } : step,
    );
    const timeline = [...task.timeline, timelineEntry(planStepId, "Cancelled", "Step cancelled.")];

    return { ...task, steps, timeline, status: deriveTaskStatus(steps) };
  },

  fail(task: ExecutionTask, planStepId: string, message: string): ExecutionTask {
    const index = task.steps.findIndex((step) => step.planStepId === planStepId);
    if (index === -1) return task;

    const failed: ExecutionStep = {
      ...task.steps[index],
      status: "Failed",
      error: createExecutionError(message),
    };

    const steps = [...task.steps];
    steps[index] = failed;
    const timeline = [...task.timeline, timelineEntry(planStepId, "Failed", message)];

    return { ...task, steps, timeline, status: deriveTaskStatus(steps) };
  },
};
