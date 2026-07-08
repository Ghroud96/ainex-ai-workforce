import type {
  WorkflowStep,
  WorkflowStepIntelligenceDecision,
  WorkflowStepIntelligenceDecisionLabel,
} from "@/lib/workflow/WorkflowTypes";

export interface AiDecisionGateInput {
  step: WorkflowStep;
  workflowRequiresApproval: boolean;
  approved?: boolean;
}

export interface AiDecisionGateResult extends WorkflowStepIntelligenceDecision {
  stepId: string;
}

export type AiUsageLabel = WorkflowStepIntelligenceDecisionLabel;
