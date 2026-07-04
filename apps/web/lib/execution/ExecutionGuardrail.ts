import { approvalStore } from "@/lib/execution/ExecutionApproval";
import type { PlanStep } from "@/lib/planning/PlanTypes";

export interface GuardrailCheck {
  allowed: boolean;
  waitingApproval: boolean;
  reason?: string;
}

// Checked before a step actually "runs." No AI, no workflow — just the
// business rule that a step requiring approval cannot execute until that
// approval is granted.
export function checkGuardrails(step: PlanStep): GuardrailCheck {
  if (!step.requiresApproval) {
    return { allowed: true, waitingApproval: false };
  }

  const approval = approvalStore.request(step.id, `Approval required for: ${step.title}`);

  if (approval.status === "pending") {
    return { allowed: false, waitingApproval: true, reason: "Awaiting human approval." };
  }

  if (approval.status === "rejected") {
    return { allowed: false, waitingApproval: false, reason: "Approval was rejected." };
  }

  return { allowed: true, waitingApproval: false };
}
