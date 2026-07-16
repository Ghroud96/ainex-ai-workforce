import { WORKER_CAPABILITIES, type DigitalWorker } from "@/data/workers";

export default function WorkerCapability({ worker }: { worker: DigitalWorker }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {WORKER_CAPABILITIES.map((capability) => {
        const enabled = worker.capabilities.includes(capability);

        return (
          <div
            key={capability}
            className={`flex items-center gap-3 rounded-lg border border-slate-200/70 p-4 text-sm ${
              enabled ? "bg-white text-slate-700" : "bg-slate-50 text-slate-400"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                enabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-400"
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
