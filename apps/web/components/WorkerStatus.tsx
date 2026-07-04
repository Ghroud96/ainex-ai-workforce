import type { WorkerStatusValue } from "@/data/workers";

const toneByStatus: Record<WorkerStatusValue, string> = {
  Available: "bg-green-500/10 text-green-400",
  "In Development": "bg-amber-500/10 text-amber-400",
  "Coming Soon": "bg-slate-500/10 text-slate-400",
};

export default function WorkerStatus({ status }: { status: WorkerStatusValue }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${toneByStatus[status]}`}
    >
      {status}
    </span>
  );
}
