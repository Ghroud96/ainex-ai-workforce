import type { AiDecisionGateResult } from "@/lib/workflow/ai/AiDecisionTypes";
import type { WorkflowAiUsageRecord } from "@/lib/workflow/WorkflowTypes";

const DEFAULT_MODEL = "Deterministic Gate";

export function buildAiUsageRecord(runId: string, decision: AiDecisionGateResult): WorkflowAiUsageRecord {
  return {
    runId,
    stepId: decision.stepId,
    usedIntelligence: decision.usedIntelligence,
    label: decision.label,
    reason: decision.reason,
    model: decision.usedIntelligence ? "gpt-4.1-mini" : DEFAULT_MODEL,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: decision.estimatedCostUsd,
    estimatedSavedUsd: decision.estimatedSavedUsd,
    recordedAt: new Date().toISOString(),
  };
}
