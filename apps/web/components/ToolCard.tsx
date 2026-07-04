export default function ToolCard({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm font-medium text-slate-200">
      {name}
    </div>
  );
}
