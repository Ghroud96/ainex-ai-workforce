export default function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-6">
      <p className="text-slate-400">{title}</p>
      <h3 className="mt-4 text-3xl font-bold">{value}</h3>
    </div>
  );
}
