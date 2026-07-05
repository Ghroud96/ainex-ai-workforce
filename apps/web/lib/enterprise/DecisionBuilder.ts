// Decision Center's data source — a pure derivation over the same signals
// the Morning Executive Brief and Business Risks & Opportunities already
// use (buildRecommendedActions, enrichBusinessEvent over
// buildRiskAndOpportunityEvents), reshaped into a single "things a human
// needs to approve or reject today" list. No new data is invented; only
// the `status` field (added by lib/decisions/DecisionStore.ts) is
// something this file doesn't know about — every other field is derived
// here, deterministically, from the generated company.
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { WORKER_NAMES_BY_ID, buildRecommendedActions, enrichBusinessEvent, type PriorityLevel } from "@/lib/enterprise/BusinessInsights";
import { buildRiskAndOpportunityEvents } from "@/lib/enterprise/NarrativeBuilder";
import { WorkflowService } from "@/lib/workflow/WorkflowService";

export type DecisionStatus = "Pending" | "Approved" | "Rejected";

export interface Decision {
  id: string;
  text: string;
  businessImpact: string;
  risk: string;
  priority: PriorityLevel;
  recommendedWorkerId: string;
  recommendedWorkerName: string;
  recommendedWorkflowName?: string;
  status: DecisionStatus;
  companyId: string;
}

export function buildDecisions(company: GeneratedCompany): Omit<Decision, "status">[] {
  const decisions: Omit<Decision, "status">[] = [];
  const { risks, opportunities } = buildRiskAndOpportunityEvents(company);

  for (const event of [...risks, ...opportunities]) {
    const enriched = enrichBusinessEvent(event);
    decisions.push({
      id: `decision-event-${event.id}`,
      text: `Address: ${enriched.title}`,
      businessImpact: enriched.businessImpact,
      risk: enriched.category === "Risk" ? enriched.description : "Missing this window means a competitor or churn risk may close it first.",
      priority: enriched.priority,
      recommendedWorkerId: enriched.recommendedWorkerId ?? "executive",
      recommendedWorkerName: enriched.recommendedWorkerName ?? WORKER_NAMES_BY_ID.executive,
      recommendedWorkflowName: enriched.suggestedWorkflowName,
      companyId: company.profile.id,
    });
  }

  const actions = buildRecommendedActions(company).filter((action) => action.priority !== "Low");
  for (const [index, action] of actions.entries()) {
    const workflow = WorkflowService.recommendedForWorker(action.responsibleWorkerId)[0];
    decisions.push({
      id: `decision-action-${index}`,
      text: action.text,
      businessImpact: `Left unaddressed, this stays open and compounds for ${action.responsibleWorkerName}.`,
      risk: "Delay increases financial or operational exposure the longer it sits.",
      priority: action.priority,
      recommendedWorkerId: action.responsibleWorkerId,
      recommendedWorkerName: action.responsibleWorkerName,
      recommendedWorkflowName: workflow?.name,
      companyId: company.profile.id,
    });
  }

  return decisions.slice(0, 8);
}
