import TagBadge from "@/components/TagBadge";
import WorkflowAiUsageBadge from "@/components/WorkflowAiUsageBadge";
import type { Workflow, WorkflowRun } from "@/lib/workflow/WorkflowTypes";

export default function WorkflowRunStepTimeline({ workflow, run }: { workflow: Workflow; run: WorkflowRun }) {
  return (
    <div className="space-y-3">
      {workflow.steps.map((step) => {
        const result = run.stepResults.find((item) => item.stepId === step.id);
        const decision = result?.intelligence;

        return (
          <div key={step.id} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {step.order}. {step.name}
                </p>
                <p className="mt-1 text-sm text-slate-400">{step.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {decision && <WorkflowAiUsageBadge label={decision.label} />}
                <TagBadge label={result?.status ?? "Pending"} />
              </div>
            </div>

            {decision && (
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <Detail title="Decision Reason" value={decision.reason} />
                <Detail title="Estimated Cost" value={`$${decision.estimatedCostUsd.toFixed(4)}`} />
                <Detail title="Estimated Saved" value={`$${decision.estimatedSavedUsd.toFixed(4)}`} />
              </div>
            )}

            {result?.output && <p className="mt-4 rounded-lg bg-slate-800/60 p-3 text-sm text-slate-300">{result.output}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Detail({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</p>
      <p className="mt-1 text-slate-300">{value}</p>
    </div>
  );
}
