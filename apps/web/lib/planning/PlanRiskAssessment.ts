import type { Plan } from "@/lib/planning/PlanTypes";

export type PlanRiskLevel = "Low" | "Medium" | "High";

export interface PlanRiskAssessment {
  riskLevel: PlanRiskLevel;
  reasons: string[];
}

// Risk of the plan itself (coordination overhead, missing approvals,
// scope) — distinct from the Reasoning Engine's risk findings about the
// underlying business question.
export function assessPlanRisk(plan: Plan): PlanRiskAssessment {
  const reasons: string[] = [];

  if (plan.collaboratingWorkerIds.length > 2) {
    reasons.push(
      `${plan.collaboratingWorkerIds.length} workers are involved — coordination overhead increases delivery risk.`,
    );
  }

  if (plan.requiresWorkflow && !plan.requiresHumanApproval) {
    reasons.push("A workflow trigger is planned without requiring human approval.");
  }

  if (plan.steps.length > 6) {
    reasons.push("This plan has more than 6 steps — consider splitting it into phases.");
  }

  const riskLevel: PlanRiskLevel = reasons.length >= 2 ? "High" : reasons.length === 1 ? "Medium" : "Low";

  return { riskLevel, reasons };
}
