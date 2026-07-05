import { approveDecision, rejectDecision } from "@/app/decisions/actions";
import PriorityBadge from "@/components/PriorityBadge";
import TagBadge from "@/components/TagBadge";
import type { Decision } from "@/lib/enterprise/DecisionBuilder";

const STATUS_TONE: Record<Decision["status"], string> = {
  Pending: "bg-slate-500/10 text-slate-400",
  Approved: "bg-green-500/10 text-green-400",
  Rejected: "bg-red-500/10 text-red-400",
};

export default function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className="flex flex-col rounded-xl bg-slate-900 p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-100">{decision.text}</p>
        <PriorityBadge priority={decision.priority} />
      </div>

      <p className="mt-3 text-sm text-slate-400">{decision.businessImpact}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TagBadge label={`Owner: ${decision.recommendedWorkerName}`} />
        {decision.recommendedWorkflowName && <TagBadge label={`Workflow: ${decision.recommendedWorkflowName}`} />}
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[decision.status]}`}>
          {decision.status}
        </span>
      </div>

      <details className="mt-4 text-sm text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-300">View Details</summary>
        <p className="mt-2">
          <span className="font-medium text-slate-300">Risk: </span>
          {decision.risk}
        </p>
      </details>

      {decision.status === "Pending" && (
        <div className="mt-4 flex items-center gap-3 border-t border-slate-800 pt-4">
          <form action={approveDecision}>
            <input type="hidden" name="id" value={decision.id} />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Approve
            </button>
          </form>
          <form action={rejectDecision}>
            <input type="hidden" name="id" value={decision.id} />
            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
