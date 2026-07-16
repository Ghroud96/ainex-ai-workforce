import type { DigitalWorker } from "@/data/workers";
import WorkerStatus from "@/components/WorkerStatus";

export default function WorkerHeader({ worker }: { worker: DigitalWorker }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
            {worker.department}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{worker.name}</h1>
          <p className="mt-1 text-slate-500">{worker.businessFunction}</p>
        </div>

        <WorkerStatus status={worker.status} />
      </div>

      <p className="mt-6 max-w-3xl text-slate-600">{worker.businessDescription}</p>

      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Business Value
        </p>
        <p className="mt-1 text-sm text-slate-700">{worker.businessValue}</p>
      </div>
    </div>
  );
}
