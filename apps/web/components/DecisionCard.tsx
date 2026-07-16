import { approveDecision, rejectDecision } from "@/app/decisions/actions";
import PriorityBadge from "@/components/PriorityBadge";
import TagBadge from "@/components/TagBadge";
import type { Decision } from "@/lib/enterprise/DecisionBuilder";

const STATUS_TONE: Record<Decision["status"], string> = {
  Pending: "bg-slate-100 text-slate-600",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

export default function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{decision.text}</p>
        <PriorityBadge priority={decision.priority} />
      </div>

      <p className="mt-3 text-sm text-slate-500">{decision.businessImpact}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TagBadge label={`Owner: ${decision.recommendedWorkerName}`} />
        {decision.recommendedWorkflowName && <TagBadge label={`Workflow: ${decision.recommendedWorkflowName}`} />}
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[decision.status]}`}>
          {decision.status}
        </span>
      </div>

      <details className="mt-4 text-sm text-slate-500">
        <summary className="cursor-pointer font-medium text-slate-700">View Details</summary>
        <p className="mt-2">
          <span className="font-medium text-slate-700">Risk: </span>
          {decision.risk}
        </p>
      </details>

      {decision.status === "Pending" && (
        <div className="mt-4 flex items-center gap-3 border-t border-slate-200/70 pt-4">
          <form action={approveDecision}>
            <input type="hidden" name="id" value={decision.id} />
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Approve
            </button>
          </form>
          <form action={rejectDecision}>
            <input type="hidden" name="id" value={decision.id} />
            <button
              type="submit"
              className="rounded-lg border border-slate-200/70 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
