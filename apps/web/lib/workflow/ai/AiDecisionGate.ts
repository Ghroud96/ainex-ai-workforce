import { estimateIntelligenceCost, estimateSkippedIntelligenceCost } from "@/lib/workflow/ai/AiCostEstimator";
import type { AiDecisionGateInput, AiDecisionGateResult } from "@/lib/workflow/ai/AiDecisionTypes";
import { resolveStepIntelligencePolicy } from "@/lib/workflow/ai/AiStepPolicy";

export function decideStepIntelligence(input: AiDecisionGateInput): AiDecisionGateResult {
  const policy = resolveStepIntelligencePolicy(input.step);

  if (policy.mode === "rule-based") {
    return {
      stepId: input.step.id,
      label: input.step.actionType === "Request Approval" ? "Human Approval Required" : "Rule-Based Step",
      usedIntelligence: false,
      reason: policy.reason,
      decisionSource: input.step.actionType === "Request Approval" ? "approval" : "policy",
      estimatedCostUsd: 0,
      estimatedSavedUsd: estimateSkippedIntelligenceCost(input.step),
    };
  }

  if (policy.mode === "intelligence-required") {
    return {
      stepId: input.step.id,
      label: "Intelligence Used",
      usedIntelligence: true,
      reason: policy.reason,
      decisionSource: "policy",
      estimatedCostUsd: estimateIntelligenceCost(input.step),
      estimatedSavedUsd: 0,
    };
  }

  return {
    stepId: input.step.id,
    label: "Intelligence Skipped",
    usedIntelligence: false,
    reason: `${policy.reason} V1 skipped Intelligence because structured workflow data was sufficient.`,
    decisionSource: "input",
    estimatedCostUsd: 0,
    estimatedSavedUsd: estimateSkippedIntelligenceCost(input.step),
  };
}
