import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import { assessPlanRisk, type PlanRiskAssessment } from "@/lib/planning/PlanRiskAssessment";
import { buildExecutionPlan } from "@/lib/planning/ExecutionPlanBuilder";
import type { Plan } from "@/lib/planning/PlanTypes";
import { validatePlan, type PlanValidationResult } from "@/lib/planning/PlanValidation";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";

export interface PlanningResult {
  plan: Plan;
  validation: PlanValidationResult;
  risk: PlanRiskAssessment;
}

// Decides what should happen next: which worker acts, which capability is
// used, whether a workflow follows, and whether human approval is
// required. No worker is invoked and no workflow is triggered here —
// this only produces the plan the Execution Engine (B8) would run.
export const PlanningEngine = {
  plan(
    worker: WorkerInstance,
    goal: string,
    reasoning: ReasoningResult,
    knowledgeContext: KnowledgeContext,
  ): PlanningResult {
    const plan = buildExecutionPlan(worker, goal, reasoning, knowledgeContext);
    const validation = validatePlan(plan);
    const risk = assessPlanRisk(plan);

    return { plan, validation, risk };
  },
};
