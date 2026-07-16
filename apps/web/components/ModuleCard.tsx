type StatusTone = "green" | "amber" | "slate";

const toneClasses: Record<StatusTone, string> = {
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
};

export type ModuleCardProps = {
  title: string;
  description: string;
  detail?: string;
  status?: string;
  statusTone?: StatusTone;
};

export default function ModuleCard({
  title,
  description,
  detail,
  status,
  statusTone = "slate",
}: ModuleCardProps) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {status && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${toneClasses[statusTone]}`}
          >
            {status}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-500">{description}</p>
      {detail && <p className="mt-3 text-sm text-slate-600">{detail}</p>}
    </div>
  );
}
