import type { PriorityLevel } from "@/lib/enterprise/BusinessInsights";

const TONE: Record<PriorityLevel, string> = {
  Critical: "bg-red-500/10 text-red-400",
  High: "bg-amber-500/10 text-amber-400",
  Medium: "bg-blue-500/10 text-blue-400",
  Low: "bg-slate-500/10 text-slate-400",
};

export default function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONE[priority]}`}>
      {priority}
    </span>
  );
}
