export default function WorkerIntelligenceLoading() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-40 rounded-xl bg-slate-900" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-lg bg-slate-900" />
        ))}
      </div>

      <div className="h-56 rounded-xl bg-slate-900" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 rounded-lg bg-slate-900" />
        ))}
      </div>
    </div>
  );
}
