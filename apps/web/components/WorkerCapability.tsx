import { WORKER_CAPABILITIES, type DigitalWorker } from "@/data/workers";

export default function WorkerCapability({ worker }: { worker: DigitalWorker }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {WORKER_CAPABILITIES.map((capability) => {
        const enabled = worker.capabilities.includes(capability);

        return (
          <div
            key={capability}
            className={`flex items-center gap-3 rounded-lg border border-slate-800 p-4 text-sm ${
              enabled ? "bg-slate-900 text-slate-200" : "bg-slate-900/40 text-slate-600"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                enabled ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-600"
              }`}
            >
              {enabled ? "✓" : "–"}
            </span>
            {capability}
          </div>
        );
      })}
    </div>
  );
}
