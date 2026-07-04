export default function KnowledgeCard({
  name,
  active = false,
  onClick,
}: {
  name: string;
  active?: boolean;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm font-medium text-slate-200">
        {name}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-sm font-medium transition-colors ${
        active
          ? "border-blue-600 bg-blue-600/10 text-blue-300"
          : "border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700"
      }`}
    >
      {name}
    </button>
  );
}
