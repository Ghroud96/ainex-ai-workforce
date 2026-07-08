import type { WorkflowStep, WorkflowStepIntelligencePolicy } from "@/lib/workflow/WorkflowTypes";

const ACTION_POLICY: Record<string, WorkflowStepIntelligencePolicy> = {
  "Generate Report": {
    mode: "intelligence-optional",
    reason: "A generated report may use Intelligence when narrative synthesis is required.",
    estimatedCostUsd: 0.018,
  },
  "Send Email": {
    mode: "intelligence-optional",
    reason: "Message drafting may use Intelligence, but structured reminders can be sent without it.",
    estimatedCostUsd: 0.01,
  },
  "Request Approval": {
    mode: "rule-based",
    reason: "Approval routing is a deterministic control step.",
    estimatedSkippedCostUsd: 0.012,
  },
  "Notify Manager": {
    mode: "rule-based",
    reason: "Manager notification uses known workflow context and does not require generated reasoning.",
    estimatedSkippedCostUsd: 0.012,
  },
  "Create Task": {
    mode: "rule-based",
    reason: "Task creation uses structured workflow data.",
    estimatedSkippedCostUsd: 0.012,
  },
  "Create Reminder": {
    mode: "rule-based",
    reason: "Reminder creation uses structured workflow data.",
    estimatedSkippedCostUsd: 0.012,
  },
  "Update CRM": {
    mode: "rule-based",
    reason: "CRM updates should use deterministic field mappings.",
    estimatedSkippedCostUsd: 0.012,
  },
  "Send WhatsApp": {
    mode: "rule-based",
    reason: "The follow-up message template is known before execution.",
    estimatedSkippedCostUsd: 0.012,
  },
};

export function resolveStepIntelligencePolicy(step: WorkflowStep): WorkflowStepIntelligencePolicy {
  if (step.intelligencePolicy) return step.intelligencePolicy;

  if (step.actionType && ACTION_POLICY[step.actionType]) {
    return ACTION_POLICY[step.actionType];
  }

  return {
    mode: "rule-based",
    reason: "No Intelligence policy was declared, so V1 defaults to deterministic execution.",
    estimatedSkippedCostUsd: 0.012,
  };
}
