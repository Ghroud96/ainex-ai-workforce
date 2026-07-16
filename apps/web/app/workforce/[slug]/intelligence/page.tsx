import { notFound } from "next/navigation";
import EmptyState from "@/components/design/EmptyState";
import EntityCard from "@/components/design/EntityCard";
import ExecutiveDecisionCard from "@/components/design/ExecutiveDecisionCard";
import PageSection from "@/components/design/PageSection";
import StatCard from "@/components/design/StatCard";
import StatusBadge, { type StatusTone } from "@/components/design/StatusBadge";
import Expandable from "@/components/Expandable";
import { accent, surface, text } from "@/lib/design/colors";
import { spacing } from "@/lib/design/spacing";
import { type } from "@/lib/design/typography";
import { enrichWorkflowRun } from "@/lib/enterprise/BusinessInsights";
import type { ActionItem, BusinessPriorityLevel, ConfidenceLabel, FindingCategory, ReasoningFinding } from "@/lib/reasoning/ReasoningTypes";
import { WorkerRuntime } from "@/lib/runtime/WorkerRuntime";
import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { WorkflowRun, WorkflowStatus } from "@/lib/workflow/WorkflowTypes";
import { WorkforceService } from "@/services/workforce/WorkforceService";

const PRIORITY_TONE: Record<BusinessPriorityLevel, StatusTone> = {
  Critical: "danger",
  High: "warning",
  Medium: "info",
  Low: "neutral",
};

const CONFIDENCE_TONE: Record<ConfidenceLabel, StatusTone> = {
  High: "success",
  Medium: "info",
  Low: "warning",
};

const FINDING_TONE: Record<FindingCategory, StatusTone> = {
  risk: "danger",
  opportunity: "success",
  anomaly: "warning",
};

const RUN_STATUS_TONE: Record<WorkflowStatus, StatusTone> = {
  Draft: "neutral",
  Active: "info",
  Paused: "neutral",
  Running: "info",
  Completed: "success",
  Failed: "danger",
  Cancelled: "neutral",
  "Requires Approval": "warning",
};

// The Intelligence page answers one question: "What does AINEX understand
// about this company?" — Executive Understanding leads, the technical plan
// and execution trace that produced it is demoted to Supporting Evidence.
// Same WorkerRuntime.handle() pipeline and WorkflowService calls as before
// this migration; only how the result is organized and rendered changed.
export default async function WorkerIntelligencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workerInstance = WorkforceService.getById(slug);

  if (!workerInstance) {
    notFound();
  }

  const worker = WorkforceService.toCardData(workerInstance);
  const health = WorkforceService.getHealth(workerInstance);

  const intelligence = await WorkerRuntime.handle({
    workerId: workerInstance.id,
    userMessage: `Review current priorities for ${worker.department}`,
  });

  const recentWorkflowRuns = WorkflowService.runHistoryForWorker(workerInstance.id).slice(0, 5);
  const workflowApprovalsRequired = WorkflowService.approvalsRequiredForWorker(workerInstance.id);
  const recommendedWorkflows = WorkflowService.recommendedForWorker(workerInstance.id);

  const stepsByPlanStepId = new Map(
    intelligence?.execution.steps.map((step) => [step.planStepId, step] as const) ?? [],
  );
  const pendingSteps =
    intelligence?.planning.plan.steps.filter((step) => {
      const status = stepsByPlanStepId.get(step.id)?.status;
      return status === "Pending" || status === "Running";
    }) ?? [];
  const approvalSteps =
    intelligence?.planning.plan.steps.filter(
      (step) => stepsByPlanStepId.get(step.id)?.status === "Waiting Approval",
    ) ?? [];
  const completedSteps =
    intelligence?.planning.plan.steps.filter(
      (step) => stepsByPlanStepId.get(step.id)?.status === "Completed",
    ) ?? [];
  const failedSteps =
    intelligence?.planning.plan.steps.filter(
      (step) => stepsByPlanStepId.get(step.id)?.status === "Failed",
    ) ?? [];

  // Actions are only ever synthesized from risk findings (ActionRecommendation.ts),
  // titled "Address: {finding.title}" — this recovers that link so each AI
  // Recommendation card can cite the specific finding driving it, instead of
  // presenting the recommendation as if it came from nowhere.
  const findingByTitle = new Map(intelligence?.reasoning.findings.map((finding) => [finding.title, finding]) ?? []);
  const primaryFollowUp = intelligence?.reasoning.followUps[0] ?? "No follow-up action required at this time.";

  return (
    <>
      <PageSection>
        <ExecutiveDecisionCard
          eyebrow="Executive Understanding"
          decision={intelligence?.reasoning.executiveSummary.headline ?? "No summary available yet."}
          whyItMatters={
            intelligence?.reasoning.executiveSummary.narrative ??
            "Run this worker to generate an executive read of current priorities."
          }
        />
        {intelligence && (
          <div className="mt-4 flex flex-wrap gap-3">
            <StatusBadge
              label={`Current Focus: ${intelligence.reasoning.overallPriority.level} priority`}
              tone={PRIORITY_TONE[intelligence.reasoning.overallPriority.level]}
            />
            <StatusBadge
              label={`Confidence: ${intelligence.reasoning.confidence.label}`}
              tone={CONFIDENCE_TONE[intelligence.reasoning.confidence.label]}
            />
          </div>
        )}
      </PageSection>

      <PageSection
        title="Business Intelligence"
        description="Risks, opportunities, and anomalies AINEX identified from today's knowledge review — insight, not a document list."
      >
        {!intelligence || intelligence.reasoning.findings.length === 0 ? (
          <EmptyState
            title="No business intelligence yet"
            description="This worker hasn't identified any risks, opportunities, or anomalies from today's knowledge review."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {intelligence.reasoning.findings.map((finding) => (
              <EntityCard
                key={finding.id}
                title={finding.title}
                status={<StatusBadge label={finding.category} tone={FINDING_TONE[finding.category]} />}
              >
                <p className={`${type.body} ${text.secondary}`}>{finding.description}</p>
              </EntityCard>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection
        title="AI Recommendations"
        description="What AINEX recommends doing next, and why."
      >
        {!intelligence || intelligence.reasoning.actions.length === 0 ? (
          <EmptyState
            title="No recommendations right now"
            description="AINEX has no concrete action to recommend from today's findings."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {intelligence.reasoning.actions.map((action) => (
              <RecommendationDetail
                key={action.id}
                action={action}
                finding={findingByTitle.get(action.title.replace(/^Address: /, ""))}
                followUp={primaryFollowUp}
              />
            ))}
          </div>
        )}
      </PageSection>

      <PageSection
        title="Supporting Evidence"
        description="How AINEX reached the understanding above — plan, execution, and workflow detail, for anyone verifying the work."
      >
        <div className="space-y-4">
          <Expandable summary="View the plan and execution trace">
            <div className="space-y-4">
              <EntityCard title="Plan" meta={intelligence?.planning.plan.goal ?? "No plan available yet."}>
                {!intelligence || intelligence.planning.plan.steps.length === 0 ? (
                  <p className={`${type.body} ${text.muted}`}>
                    No plan steps were generated for this request — the underlying question had no risks,
                    opportunities, or anomalies to act on.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {intelligence.planning.plan.steps.map((step) => (
                      <li key={step.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3 first:border-t-0 first:pt-0">
                        <div>
                          <p className={`${type.body} ${text.primary}`}>{step.title}</p>
                          <p className={`mt-1 ${type.caption} ${text.muted}`}>
                            {step.workerId ?? "—"} · {step.capabilityId ?? "—"} · {step.priority.level} priority
                          </p>
                        </div>
                        {step.requiresApproval && <StatusBadge label="Requires Approval" tone="warning" />}
                      </li>
                    ))}
                  </ul>
                )}
              </EntityCard>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Pending" value={String(pendingSteps.length)} />
                <StatCard label="Awaiting Approval" value={String(approvalSteps.length)} />
                <StatCard label="Completed" value={String(completedSteps.length)} />
                <StatCard label="Failed" value={String(failedSteps.length)} />
              </div>

              <EntityCard title="Execution Timeline">
                {!intelligence || intelligence.execution.timeline.length === 0 ? (
                  <p className={`${type.body} ${text.muted}`}>No recorded activity yet.</p>
                ) : (
                  <div className="space-y-1">
                    {intelligence.execution.timeline.map((entry, index) => (
                      <p key={index} className={`${type.caption} ${text.secondary}`}>
                        <span className={text.muted}>{entry.timestamp}</span> — {entry.message}
                      </p>
                    ))}
                  </div>
                )}
              </EntityCard>
            </div>
          </Expandable>

          <Expandable summary="View workflow automation detail">
            <div className="space-y-4">
              <div>
                <p className={`${type.caption} ${text.muted}`}>Recommended Workflows</p>
                {recommendedWorkflows.length === 0 ? (
                  <p className={`mt-2 ${type.body} ${text.muted}`}>No workflow is registered for this worker yet.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {recommendedWorkflows.map((workflow) => (
                      <EntityCard key={workflow.id} title={workflow.name}>
                        <p className={`${type.body} ${text.secondary}`}>{workflow.description}</p>
                      </EntityCard>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className={`${type.caption} ${text.muted}`}>Waiting on Approval</p>
                {workflowApprovalsRequired.length === 0 ? (
                  <p className={`mt-2 ${type.body} ${text.muted}`}>No workflow runs are waiting on approval.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {workflowApprovalsRequired.map((run) => (
                      <WorkflowRunCard key={run.id} run={run} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className={`${type.caption} ${text.muted}`}>Recent Runs</p>
                {recentWorkflowRuns.length === 0 ? (
                  <p className={`mt-2 ${type.body} ${text.muted}`}>No workflow runs recorded yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {recentWorkflowRuns.map((run) => (
                      <WorkflowRunCard key={run.id} run={run} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Expandable>

          <Expandable summary="View worker health and memory">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <EntityCard
                title="Operational Status"
                status={
                  <StatusBadge label={health.operational ? "Operational" : "Needs Attention"} tone={health.operational ? "success" : "danger"} />
                }
              >
                <p className={`${type.body} ${text.secondary}`}>{health.notes}</p>
              </EntityCard>
              <EntityCard title="Worker Memory">
                <p className={`${type.body} ${text.muted}`}>
                  Short Term, Conversation, Company, Knowledge, and Long Term memory are not yet populated for this worker.
                </p>
              </EntityCard>
            </div>
          </Expandable>
        </div>
      </PageSection>

      <PageSection
        title="Knowledge Sources"
        description="The company documents AINEX read to reach the understanding above."
      >
        {!intelligence || intelligence.rag.citations.length === 0 ? (
          <EmptyState
            title="No source documents cited"
            description="This worker didn't find a company document directly relevant to today's question."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Documents Cited" value={String(intelligence.rag.citations.length)} />
              <StatCard label="Confidence" value={intelligence.reasoning.confidence.label} />
              <StatCard label="Last Analysed" value={intelligence.reasoning.generatedAt} />
            </div>
            <div className="mt-4 space-y-2">
              {intelligence.rag.citations.map((citation) => (
                <EntityCard key={citation.documentId} title={citation.title} meta={citation.department} />
              ))}
            </div>
          </>
        )}
      </PageSection>
    </>
  );
}

function RecommendationDetail({
  action,
  finding,
  followUp,
}: {
  action: ActionItem;
  finding?: ReasoningFinding;
  followUp: string;
}) {
  const expectedOutcome = finding
    ? finding.category === "risk"
      ? `Removes the risk flagged in "${finding.title}" before it escalates.`
      : `Acts on the opportunity flagged in "${finding.title}" before it's missed.`
    : "Resolves the flagged item before it affects business outcomes.";

  return (
    <div className={`${surface.sunken} rounded-lg border-l-2 ${accent.secondaryBorder} ${spacing.cardPadding}`}>
      <p className={`${type.eyebrow} ${accent.secondaryText}`}>AI Recommendation</p>
      <p className={`mt-2 ${type.body} font-medium ${text.primary}`}>{action.title.replace(/^Address: /, "")}</p>

      <dl className="mt-4 space-y-3">
        <div>
          <dt className={`${type.caption} ${text.muted}`}>Business reason</dt>
          <dd className={`mt-1 ${type.body} ${text.secondary}`}>{action.description}</dd>
        </div>
        <div>
          <dt className={`${type.caption} ${text.muted}`}>Expected outcome</dt>
          <dd className={`mt-1 ${type.body} ${text.secondary}`}>{expectedOutcome}</dd>
        </div>
        <div>
          <dt className={`${type.caption} ${text.muted}`}>Suggested next action</dt>
          <dd className={`mt-1 ${type.body} ${text.secondary}`}>{followUp}</dd>
        </div>
      </dl>

      <p className={`mt-4 ${type.caption} ${text.muted}`}>
        Rule-based · {action.priority.level} priority
      </p>
    </div>
  );
}

function WorkflowRunCard({ run }: { run: WorkflowRun }) {
  const workflow = WorkflowService.getById(run.workflowId);
  const enriched = enrichWorkflowRun(run, workflow);

  return (
    <EntityCard
      title={workflow?.name ?? run.workflowId}
      meta={`Triggered by ${run.triggeredBy} · ${run.startedAt}`}
      status={<StatusBadge label={run.status} tone={RUN_STATUS_TONE[run.status]} />}
    >
      <p className={`${type.caption} ${text.muted}`}>
        Waiting for: {enriched.waitingFor} · Est. completion: {enriched.estimatedCompletion} · {enriched.priority} priority
      </p>
      {run.error && <p className={`mt-1 ${type.caption} text-red-400`}>{run.error}</p>}
    </EntityCard>
  );
}
