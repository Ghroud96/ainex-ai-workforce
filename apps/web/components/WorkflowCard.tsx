export default function WorkflowCard({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white p-4">
      <p className="text-sm font-medium text-slate-800">{name}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
