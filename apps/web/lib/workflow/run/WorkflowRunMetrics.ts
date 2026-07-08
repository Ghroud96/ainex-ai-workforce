import type { WorkflowAiUsageRecord, WorkflowRunCostMetrics, WorkflowStepResult } from "@/lib/workflow/WorkflowTypes";

export function buildWorkflowRunMetrics(
  stepResults: WorkflowStepResult[],
  aiUsage: WorkflowAiUsageRecord[],
): WorkflowRunCostMetrics {
  const totalSteps = stepResults.length;
  const intelligenceUsedSteps = aiUsage.filter((record) => record.usedIntelligence).length;
  const humanApprovalSteps = aiUsage.filter((record) => record.label === "Human Approval Required").length;
  const ruleBasedSteps = aiUsage.filter((record) => record.label === "Rule-Based Step").length;
  const intelligenceSkippedSteps = aiUsage.filter(
    (record) => record.label === "Intelligence Skipped" || record.label === "Rule-Based Step" || record.label === "Human Approval Required",
  ).length;
  const avoidableSteps = intelligenceUsedSteps + intelligenceSkippedSteps;

  return {
    totalSteps,
    intelligenceUsedSteps,
    intelligenceSkippedSteps,
    ruleBasedSteps,
    humanApprovalSteps,
    intelligenceAvoidanceRate: avoidableSteps === 0 ? 0 : Math.round((intelligenceSkippedSteps / avoidableSteps) * 100),
    estimatedCostUsd: Number(aiUsage.reduce((sum, record) => sum + record.estimatedCostUsd, 0).toFixed(4)),
    estimatedSavedUsd: Number(aiUsage.reduce((sum, record) => sum + record.estimatedSavedUsd, 0).toFixed(4)),
  };
}
