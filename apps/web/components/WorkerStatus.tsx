import type { WorkerStatusValue } from "@/data/workers";

const toneByStatus: Record<WorkerStatusValue, string> = {
  Available: "bg-green-50 text-green-700",
  "In Development": "bg-amber-50 text-amber-700",
  "Coming Soon": "bg-slate-100 text-slate-600",
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
