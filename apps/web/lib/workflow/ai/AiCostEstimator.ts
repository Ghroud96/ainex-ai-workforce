import type { WorkflowStep } from "@/lib/workflow/WorkflowTypes";

const DEFAULT_INTELLIGENCE_COST_USD = 0.012;
const DEFAULT_SKIPPED_COST_USD = 0.012;

export function estimateIntelligenceCost(step: WorkflowStep): number {
  return step.intelligencePolicy?.estimatedCostUsd ?? DEFAULT_INTELLIGENCE_COST_USD;
}

export function estimateSkippedIntelligenceCost(step: WorkflowStep): number {
  return step.intelligencePolicy?.estimatedSkippedCostUsd ?? step.intelligencePolicy?.estimatedCostUsd ?? DEFAULT_SKIPPED_COST_USD;
}
