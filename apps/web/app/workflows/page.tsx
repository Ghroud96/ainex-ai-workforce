import Link from "next/link";
import ModuleCard from "@/components/ModuleCard";
import PageHeader from "@/components/PageHeader";
import PriorityBadge from "@/components/PriorityBadge";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import WorkflowCard from "@/components/WorkflowCard";
import { getAllWorkers } from "@/data/workers";
import { enrichWorkflowRun, priorityForWorkflow } from "@/lib/enterprise/BusinessInsights";
import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { Workflow, WorkflowRun, WorkflowStatus } from "@/lib/workflow/WorkflowTypes";

function toneForStatus(status: WorkflowStatus): "green" | "amber" | "slate" {
  if (status === "Active" || status === "Completed") return "green";
  if (status === "Requires Approval" || status === "Running" || status === "Paused") return "amber";
  return "slate";
}

function workerNameFor(workerId?: string): string {
  return getAllWorkers().find((worker) => worker.slug === workerId)?.name ?? workerId ?? "Unassigned";
}

export default function WorkflowsPage() {
  const library = WorkflowService.library();
  const scheduled = WorkflowService.scheduled();
  const recommended = library.filter((workflow) => workflow.trigger.type === "Worker Recommended");
  const runHistory = WorkflowService.runHistory();
  const approvalsRequired = WorkflowService.approvalsRequired();
  const failedRuns = WorkflowService.failedRuns();

  return (
    <>
      <PageHeader
        title="Workflow Automation"
        description="The processes your Digital Workforce triggers to turn a decision into action — connecting workers to the tools and systems that run your business."
      />

      <section className="mb-10">
        <SectionTitle
          title="Workflow Library"
          description="Every workflow AINEX's Digital Workforce can trigger to turn a decision into action."
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {library.map((workflow) => (
            <ModuleCard
              key={workflow.id}
              title={workflow.name}
              description={workflow.description}
              detail={`${workflow.trigger.type} · ${workflow.department} · Owner: ${workerNameFor(workflow.ownerWorkerId)} · ${priorityForWorkflow(workflow)} priority`}
              status={workflow.status}
              statusTone={toneForStatus(workflow.status)}
            />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          title="Worker Recommended Workflows"
          description="Workflows a Digital Worker can recommend triggering from a decision."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recommended.map((workflow) => (
            <div key={workflow.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-200">{workflow.name}</p>
                <TagBadge label={workerNameFor(workflow.ownerWorkerId)} />
              </div>
              <p className="mt-1 text-sm text-slate-400">{workflow.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          title="Scheduled Workflows"
          description="Workflows with a time-based trigger."
        />
        {scheduled.length === 0 ? (
          <p className="text-sm text-slate-500">No scheduled workflows.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {scheduled.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                name={workflow.name}
                description={`${workflow.trigger.description} (${workflow.trigger.cronExpression})`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <SectionTitle
          title="Approval Required"
          description="Workflow runs waiting on human approval before they execute."
        />
        <RunList runs={approvalsRequired} library={library} emptyLabel="No workflow runs are waiting on approval." />
      </section>

      <section className="mb-10">
        <SectionTitle
          title="Failed Runs"
          description="Workflow runs that did not complete successfully."
        />
        <RunList runs={failedRuns} library={library} emptyLabel="No failed workflow runs." />
      </section>

      <section>
        <SectionTitle
          title="Workflow Run History"
          description="Every recorded workflow run, most recent first."
        />
        <RunList runs={runHistory} library={library} emptyLabel="No workflow runs recorded yet." />
      </section>
    </>
  );
}

function RunList({ runs, library, emptyLabel }: { runs: WorkflowRun[]; library: Workflow[]; emptyLabel: string }) {
  if (runs.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const workflow = library.find((entry) => entry.id === run.workflowId);
        const enriched = enrichWorkflowRun(run, workflow);
        return (
          <Link
            key={run.id}
            href={`/workflows/runs/${run.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-200">{workflow?.name ?? run.workflowId}</p>
              <p className="mt-1 text-xs text-slate-500">
                Triggered by {run.triggeredBy} · {run.startedAt}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Waiting for: {enriched.waitingFor} · Est. completion: {enriched.estimatedCompletion}
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">{enriched.businessReason}</p>
              {run.error && <p className="mt-1 text-xs text-red-400">{run.error}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <TagBadge label={run.status} />
              <PriorityBadge priority={enriched.priority} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
