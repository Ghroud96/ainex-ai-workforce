import Link from "next/link";
import type { DigitalWorker } from "@/data/workers";
import WorkerStatus from "@/components/WorkerStatus";

export default function WorkerCard({ worker }: { worker: DigitalWorker }) {
  return (
    <div className="flex flex-col rounded-xl bg-slate-900 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{worker.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{worker.businessFunction}</p>
        </div>
        <WorkerStatus status={worker.status} />
      </div>

      <p className="mt-4 flex-1 text-sm text-slate-300">{worker.shortDescription}</p>

      <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
        <span className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {worker.department}
        </span>

        <Link
          href={`/workforce/${worker.slug}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
