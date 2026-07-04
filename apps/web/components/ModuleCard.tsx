type StatusTone = "green" | "amber" | "slate";

const toneClasses: Record<StatusTone, string> = {
  green: "bg-green-500/10 text-green-400",
  amber: "bg-amber-500/10 text-amber-400",
  slate: "bg-slate-500/10 text-slate-400",
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
    <div className="rounded-xl bg-slate-900 p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {status && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${toneClasses[statusTone]}`}
          >
            {status}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-400">{description}</p>
      {detail && <p className="mt-3 text-sm text-slate-300">{detail}</p>}
    </div>
  );
}
