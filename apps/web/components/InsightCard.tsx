import PriorityBadge from "@/components/PriorityBadge";
import TagBadge from "@/components/TagBadge";
import type { EnrichedBusinessEvent } from "@/lib/enterprise/BusinessInsights";

const CATEGORY_TONE: Record<EnrichedBusinessEvent["category"], string> = {
  Risk: "border-red-900/50 bg-red-950/20",
  Opportunity: "border-green-900/50 bg-green-950/20",
  Milestone: "border-blue-900/50 bg-blue-950/20",
  Operational: "border-slate-800 bg-slate-900",
};

// The enriched Business Event card: problem, business impact, affected
// departments, priority, and the recommended worker/workflow — every
// field derived from lib/enterprise/BusinessInsights.ts, not new
// generator output.
export default function InsightCard({ event }: { event: EnrichedBusinessEvent }) {
  return (
    <div className={`rounded-lg border p-4 ${CATEGORY_TONE[event.category]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-100">{event.title}</p>
        <PriorityBadge priority={event.priority} />
      </div>
      <p className="mt-2 text-sm text-slate-400">{event.businessImpact}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {event.affectedDepartments.map((department) => (
          <TagBadge key={department} label={department} />
        ))}
        <span className="text-xs text-slate-500">{event.date}</span>
      </div>
      {(event.recommendedWorkerName || event.suggestedWorkflowName) && (
        <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
          {event.recommendedWorkerName && <>Recommended: {event.recommendedWorkerName}</>}
          {event.recommendedWorkerName && event.suggestedWorkflowName && " · "}
          {event.suggestedWorkflowName && <>Suggested workflow: {event.suggestedWorkflowName}</>}
        </p>
      )}
    </div>
  );
}
