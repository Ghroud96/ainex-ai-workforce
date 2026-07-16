export default function ToolCard({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-4 text-sm font-medium text-slate-700">
      {name}
    </div>
  );
}
