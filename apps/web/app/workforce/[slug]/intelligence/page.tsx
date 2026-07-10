import { notFound } from "next/navigation";
import Expandable from "@/components/Expandable";
import PriorityBadge from "@/components/PriorityBadge";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import WorkflowCard from "@/components/WorkflowCard";
import { enrichWorkflowRun } from "@/lib/enterprise/BusinessInsights";
import type { PlanStep } from "@/lib/planning/PlanTypes";
import { WorkerRuntime } from "@/lib/runtime/WorkerRuntime";
import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { WorkflowRun } from "@/lib/workflow/WorkflowTypes";
import { WorkforceService } from "@/services/workforce/WorkforceService";

// The Intelligence page answers exactly one question: "Why did the AI make
// this decision?" — for Executives/IT/Admins/Developers, not daily work.
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

  // Runs the full B1-C9 pipeline (Runtime -> Worker Router -> ... ->
  // Execution Engine -> Action Layer -> Workflow Layer -> n8n Provider)
  // for a sample request, so this page shows real computed output rather
  // than static placeholder text. Architecture only — no real AI provider,
  // workflow, or approval process is connected, and nothing here is
  // triggered by an actual user action.
  const intelligence = await WorkerRuntime.handle({
    workerId: workerInstance.id,
    userMessage: `Review current priorities for ${worker.department}`,
  });

  // Read after WorkerRuntime.handle() so a workflow run it just triggered
  // (Action Layer -> Workflow Layer, see docs/architecture/workflow-automation.md)
  // is reflected below, not missed by reading the run store one step too early.
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

  return (
    <>
      <section>
        <SectionTitle
          title="Manager Summary"
          description="The Reasoning Engine's own read of this worker's current priorities — computed on every page load, not previously surfaced here."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-sm font-semibold text-white">
            {intelligence?.reasoning.executiveSummary.headline ?? "No summary available yet."}
          </p>
          <p className="mt-2 text-sm text-slate-300">{intelligence?.reasoning.executiveSummary.narrative}</p>
          {intelligence && (
            <div className="mt-4 flex flex-wrap gap-2">
              <TagBadge label={`Current Focus: ${intelligence.reasoning.overallPriority.level} priority`} />
              <TagBadge label={`Confidence: ${intelligence.reasoning.confidence.label}`} />
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Recent Decisions"
          description="Risks, opportunities, and anomalies this worker's Reasoning stage identified from today's knowledge review."
        />
        {!intelligence || intelligence.reasoning.findings.length === 0 ? (
          <p className="text-sm text-slate-500">No decisions recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {intelligence.reasoning.findings.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">{finding.title}</p>
                  <TagBadge label={finding.category} />
                </div>
                <p className="mt-1 text-sm text-slate-400">{finding.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Business Recommendations"
          description="Concrete actions this worker's Decision stage recommended in response to today's findings."
        />
        {!intelligence || intelligence.reasoning.actions.length === 0 ? (
          <p className="text-sm text-slate-500">No recommendations right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {intelligence.reasoning.actions.map((action) => (
              <WorkflowCard key={action.id} name={action.title} description={action.description} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Upcoming Work"
          description="Follow-up suggestions from the Reasoning Engine for what comes next."
        />
        {!intelligence || intelligence.reasoning.followUps.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-up action required right now.</p>
        ) : (
          <ul className="space-y-2">
            {intelligence.reasoning.followUps.map((followUp, index) => (
              <li key={index} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                {followUp}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle
          title="Worker Health"
          description="Live status for this Digital Worker."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Operational</p>
            <p className="mt-2 text-lg font-semibold text-white">{health.operational ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 sm:col-span-2">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Notes</p>
            <p className="mt-2 text-sm text-slate-300">{health.notes}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Worker Memory"
          description="What this Digital Worker remembers across conversations and tasks."
        />
        <Expandable summary="View memory types">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
            {["Short Term", "Conversation", "Company", "Knowledge", "Long Term"].map((memoryType) => (
              <div key={memoryType} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
                <p className="font-medium text-slate-400">{memoryType} Memory</p>
                <p className="mt-1 text-xs">Not yet populated</p>
              </div>
            ))}
          </div>
        </Expandable>
      </section>

      <section>
        <SectionTitle
          title="Current Plan"
          description="How this worker breaks a business question down into steps before acting."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Goal</p>
          <p className="mt-1 text-sm text-slate-200">
            {intelligence?.planning.plan.goal ?? "No plan available yet."}
          </p>

          {!intelligence || intelligence.planning.plan.steps.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No plan steps were generated for this request — the underlying question had no risks,
              opportunities, or anomalies to act on.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {intelligence.planning.plan.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{step.title}</p>
                    <p className="text-xs text-slate-500">
                      {step.workerId ?? "—"} · {step.capabilityId ?? "—"} · {step.priority.level} priority
                    </p>
                  </div>
                  {step.requiresApproval && <TagBadge label="Requires Approval" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Execution Results"
          description="How the plan above is carried out, step by step."
        />
        <Expandable summary="View execution results">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExecutionStepGroup title="Pending Actions" steps={pendingSteps} />
            <ExecutionStepGroup title="Approval Required" steps={approvalSteps} />
            <ExecutionStepGroup title="Completed Steps" steps={completedSteps} />
            <ExecutionStepGroup title="Failed Steps" steps={failedSteps} />
          </div>
        </Expandable>
      </section>

      <section>
        <SectionTitle
          title="Execution Timeline"
          description="Chronological record of this run."
        />
        {!intelligence || intelligence.execution.timeline.length === 0 ? (
          <p className="text-sm text-slate-500">No recorded activity yet.</p>
        ) : (
          <Expandable summary={`View ${intelligence.execution.timeline.length} timeline entries`}>
            <div className="rounded-xl bg-slate-900 p-6">
              <div className="space-y-2 text-sm text-slate-300">
                {intelligence.execution.timeline.map((entry, index) => (
                  <p key={index}>
                    <span className="text-slate-500">{entry.timestamp}</span> — {entry.message}
                  </p>
                ))}
              </div>
            </div>
          </Expandable>
        )}
      </section>

      <section>
        <SectionTitle
          title="Recommended Workflows"
          description="Workflow Automation this worker can recommend triggering to carry a decision through to completion."
        />
        {recommendedWorkflows.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow is registered for this worker yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recommendedWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.id} name={workflow.name} description={workflow.description} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Approval Required"
          description="Workflow runs for this worker waiting on human approval before they execute."
        />
        {workflowApprovalsRequired.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow runs are waiting on approval.</p>
        ) : (
          <div className="space-y-2">
            {workflowApprovalsRequired.map((run) => (
              <WorkflowRunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Recent Workflow Runs"
          description="This worker's most recent workflow runs, most recent first."
        />
        {recentWorkflowRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow runs recorded yet.</p>
        ) : (
          <Expandable summary={`View ${recentWorkflowRuns.length} recent runs`}>
            <div className="space-y-2">
              {recentWorkflowRuns.map((run) => (
                <WorkflowRunRow key={run.id} run={run} />
              ))}
            </div>
          </Expandable>
        )}
      </section>
    </>
  );
}

function ExecutionStepGroup({ title, steps }: { title: string; steps: PlanStep[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {title} ({steps.length})
      </p>
      {steps.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {steps.map((step) => (
            <li key={step.id}>{step.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkflowRunRow({ run }: { run: WorkflowRun }) {
  const workflow = WorkflowService.getById(run.workflowId);
  const enriched = enrichWorkflowRun(run, workflow);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{workflow?.name ?? run.workflowId}</p>
        <p className="mt-1 text-xs text-slate-500">
          Triggered by {run.triggeredBy} · {run.startedAt}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Waiting for: {enriched.waitingFor} · Est. completion: {enriched.estimatedCompletion}
        </p>
        {run.error && <p className="mt-1 text-xs text-red-400">{run.error}</p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        <TagBadge label={run.status} />
        <PriorityBadge priority={enriched.priority} />
      </div>
    </div>
  );
}
