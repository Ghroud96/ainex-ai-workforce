import type { Customer } from "@/lib/enterprise/EnterpriseTypes";

// A generic, rule-based business-signal scorer — the long-term seam for
// ranking and prioritizing signals across Sales, Finance, HR, Inventory,
// Procurement, and Executive Intelligence. Only scorePriority() and
// scoreOpportunity() are implemented today (both Sales call sites);
// scoreRisk()/scoreRecommendation() are the documented future additions
// for other departments, not built until a real caller needs them.
//
// Entirely rule-based, no LLM dependency — matches the Reasoning Engine's
// existing "deterministic, not Chain-of-Thought" convention
// (lib/reasoning/). This is the seam a real AI-backed scorer replaces
// later: callers (PriorityEngine, EnterpriseDemoEngine) depend only on
// these function signatures, never on how the score is computed.
//
// Distinct from lib/decisions/DecisionStore.ts, which is the Decision
// Center's unrelated approval-queue "Decision" entity (something a human
// approves or rejects). Nothing here represents an approvable decision —
// only a numeric ranking signal.

export interface BusinessSignalInput {
  value: number;
  urgencyDays: number;
  customerStatus: Customer["status"];
}

// Health weight per customer status — a churn-risk account should always
// outrank an equally-valuable healthy one, and a churned account should
// never resurface as a priority.
const STATUS_HEALTH_WEIGHT: Record<Customer["status"], number> = {
  "At Risk": 1,
  New: 0.6,
  Active: 0.3,
  Churned: 0,
};

// One shared weighted formula — value, urgency, and account health each
// contribute, so no caller ranks by value alone. Deliberately simple and
// documented as an approximation, not a calibrated model: value is
// log-scaled so a single very large deal can't dominate every other
// signal, urgency is capped at 90 days so a long-dormant account doesn't
// permanently outrank everything else.
function scoreBusinessSignal(input: BusinessSignalInput): number {
  const valueScore = Math.log10(Math.max(input.value, 1));
  const urgencyScore = Math.min(input.urgencyDays / 30, 3);
  const healthScore = STATUS_HEALTH_WEIGHT[input.customerStatus] * 3;
  return valueScore + urgencyScore + healthScore;
}

export function scorePriority(input: BusinessSignalInput): number {
  return scoreBusinessSignal(input);
}

export function scoreOpportunity(input: BusinessSignalInput): number {
  return scoreBusinessSignal(input);
}
