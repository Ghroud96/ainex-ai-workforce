export default function WorkflowCard({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-medium text-slate-200">{name}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}
