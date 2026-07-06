export default function WorkerWorkspaceLoading() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-40 rounded-xl bg-slate-900" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-slate-900" />
        ))}
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 rounded-xl bg-slate-900" />
        ))}
      </div>
    </div>
  );
}
