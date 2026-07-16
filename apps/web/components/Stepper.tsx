// A generic labeled-dot progress row — steps before currentIndex render
// green/done, the step at currentIndex renders blue/active, everything
// after renders slate/future. Extracted from DealStageStepper.tsx (now a
// thin wrapper over this) so any staged flow — the Sales deal pipeline,
// the Teach AINEX wizard, a document's Knowledge Lifecycle — gets the same
// visual language for free.
export default function Stepper({ steps, currentIndex }: { steps: readonly string[]; currentIndex: number }) {
  return (
    <div className="flex items-center">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                index < currentIndex
                  ? "bg-green-500"
                  : index === currentIndex
                    ? "bg-blue-600 ring-4 ring-blue-500/20"
                    : "bg-slate-300"
              }`}
            />
            <span
              className={`whitespace-nowrap text-[11px] ${
                index === currentIndex ? "font-semibold text-slate-900" : index < currentIndex ? "text-green-600" : "text-slate-400"
              }`}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`mb-4 h-px w-6 sm:w-10 ${index < currentIndex ? "bg-green-500" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
