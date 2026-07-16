import type { PriorityLevel } from "@/lib/enterprise/BusinessInsights";

const TONE: Record<PriorityLevel, string> = {
  Critical: "bg-red-50 text-red-700",
  High: "bg-amber-50 text-amber-700",
  Medium: "bg-blue-50 text-blue-700",
  Low: "bg-slate-100 text-slate-600",
};

export default function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TONE[priority]}`}>
      {priority}
    </span>
  );
}
