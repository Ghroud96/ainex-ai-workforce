import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import WorkflowAuditLogPanel from "@/components/WorkflowAuditLogPanel";
import WorkflowCostSavingsCard from "@/components/WorkflowCostSavingsCard";
import WorkflowRunStepTimeline from "@/components/WorkflowRunStepTimeline";
import type { Workflow, WorkflowRun } from "@/lib/workflow/WorkflowTypes";

export default function WorkflowRunDetail({ workflow, run }: { workflow: Workflow; run: WorkflowRun }) {
  return (
    <>
      <section className="rounded-xl bg-slate-900 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Workflow Run</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{workflow.name}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">{workflow.description}</p>
          </div>
          <TagBadge label={run.status} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <Meta title="Triggered By" value={run.triggeredBy} />
          <Meta title="Started" value={run.startedAt} />
          <Meta title="Completed" value={run.completedAt ?? "In progress"} />
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Cost-Saving Metrics"
          description="How much work completed as Rule-Based Steps before Intelligence was used."
        />
        <WorkflowCostSavingsCard metrics={run.costMetrics} />
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Step Timeline"
          description="Every step records whether Intelligence was used, skipped, or replaced by a rule-based control."
        />
        <WorkflowRunStepTimeline workflow={workflow} run={run} />
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Audit Log"
          description="Structured execution record for the Workflow Automation run."
        />
        <WorkflowAuditLogPanel entries={run.auditLog ?? []} />
      </section>
    </>
  );
}

function Meta({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</p>
      <p className="mt-1 text-slate-200">{value}</p>
    </div>
  );
}
