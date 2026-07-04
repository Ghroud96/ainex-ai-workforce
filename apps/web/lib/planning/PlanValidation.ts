import type { Plan } from "@/lib/planning/PlanTypes";

export type PlanIssueSeverity = "error" | "warning";

export interface PlanValidationIssue {
  severity: PlanIssueSeverity;
  message: string;
}

export interface PlanValidationResult {
  valid: boolean;
  issues: PlanValidationIssue[];
}

// Structural correctness only — no LLM judgment of whether the plan is a
// "good" plan, just whether it's well-formed enough to hand to the
// Execution Engine.
export function validatePlan(plan: Plan): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];

  if (plan.steps.length === 0) {
    issues.push({ severity: "error", message: "A plan must contain at least one step." });
  }

  const seenIds = new Set<string>();
  for (const step of plan.steps) {
    if (seenIds.has(step.id)) {
      issues.push({ severity: "error", message: `Duplicate plan step id: ${step.id}` });
    }
    seenIds.add(step.id);

    if (step.type === "worker-task" && !step.workerId) {
      issues.push({
        severity: "error",
        message: `Step "${step.title}" is a worker task but has no assigned worker.`,
      });
    }
  }

  const criticalWithoutApproval = plan.steps.some(
    (step) => step.priority.level === "Critical" && !step.requiresApproval,
  );
  if (criticalWithoutApproval) {
    issues.push({
      severity: "warning",
      message: "A Critical-priority step does not require human approval.",
    });
  }

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}
