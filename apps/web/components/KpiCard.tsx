export interface KpiTrend {
  value: number;
  direction: "up" | "down" | "flat";
}

const TREND_COLOR: Record<KpiTrend["direction"], string> = {
  up: "text-green-600",
  down: "text-red-600",
  flat: "text-slate-500",
};

const TREND_ARROW: Record<KpiTrend["direction"], string> = {
  up: "M5 15l7-7 7 7",
  down: "M19 9l-7 7-7-7",
  flat: "M5 12h14",
};

function TrendIndicator({ trend }: { trend: KpiTrend }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${TREND_COLOR[trend.direction]}`}>
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d={TREND_ARROW[trend.direction]} />
      </svg>
      {Math.abs(trend.value)}%
    </span>
  );
}

export default function KpiCard({
  title,
  value,
  trend,
}: {
  title: string;
  value: string;
  trend?: KpiTrend;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-slate-500">{title}</p>
        {trend && <TrendIndicator trend={trend} />}
      </div>
      <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</h3>
    </div>
  );
}
