export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-slate-800" />
        <div className="h-8 w-96 max-w-full rounded bg-slate-800" />
      </div>

      <div className="h-64 rounded-xl bg-slate-900" />

      <div className="h-40 rounded-xl bg-slate-900" />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-slate-900" />
        ))}
      </div>

      <div className="h-72 rounded-xl bg-slate-900" />
      <div className="h-72 rounded-xl bg-slate-900" />
    </div>
  );
}
