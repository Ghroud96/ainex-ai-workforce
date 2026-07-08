import type { WorkflowRunCostMetrics } from "@/lib/workflow/WorkflowTypes";

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

export default function WorkflowCostSavingsCard({ metrics }: { metrics: WorkflowRunCostMetrics | undefined }) {
  const safeMetrics = metrics ?? {
    totalSteps: 0,
    intelligenceUsedSteps: 0,
    intelligenceSkippedSteps: 0,
    ruleBasedSteps: 0,
    humanApprovalSteps: 0,
    intelligenceAvoidanceRate: 0,
    estimatedCostUsd: 0,
    estimatedSavedUsd: 0,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Steps Run" value={String(safeMetrics.totalSteps)} />
      <Metric title="Intelligence Avoided" value={`${safeMetrics.intelligenceAvoidanceRate}%`} />
      <Metric title="Estimated Spend" value={formatUsd(safeMetrics.estimatedCostUsd)} />
      <Metric title="Estimated Savings" value={formatUsd(safeMetrics.estimatedSavedUsd)} />
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-5">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
