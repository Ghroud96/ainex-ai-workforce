import type { DigitalWorker } from "@/data/workers";
import WorkerStatus from "@/components/WorkerStatus";

export default function WorkerHeader({ worker }: { worker: DigitalWorker }) {
  return (
    <div className="rounded-xl bg-slate-900 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            {worker.department}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white">{worker.name}</h1>
          <p className="mt-1 text-slate-400">{worker.businessFunction}</p>
        </div>

        <WorkerStatus status={worker.status} />
      </div>

      <p className="mt-6 max-w-3xl text-slate-300">{worker.businessDescription}</p>

      <div className="mt-6 rounded-lg bg-slate-800/60 p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Business Value
        </p>
        <p className="mt-1 text-sm text-slate-200">{worker.businessValue}</p>
      </div>
    </div>
  );
}
