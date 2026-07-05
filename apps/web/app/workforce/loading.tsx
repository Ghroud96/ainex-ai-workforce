export default function WorkforceLoading() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-slate-800" />
        <div className="h-8 w-96 max-w-full rounded bg-slate-800" />
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-20 rounded-xl bg-slate-900" />
        ))}
      </div>

      <div className="h-56 rounded-xl bg-slate-900" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-48 rounded-xl bg-slate-900" />
        ))}
      </div>
    </div>
  );
}
