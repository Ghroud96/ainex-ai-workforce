export default function KnowledgeStatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-6">
      <p className="text-slate-400">{title}</p>
      <h3 className="mt-4 text-3xl font-bold text-white">{value}</h3>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}
