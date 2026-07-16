import { border, surface, text } from "@/lib/design/colors";
import { elevation } from "@/lib/design/elevation";
import { radius } from "@/lib/design/radius";
import { spacing } from "@/lib/design/spacing";
import { numeric, type } from "@/lib/design/typography";

export interface StatTrend {
  value: number;
  direction: "up" | "down" | "flat";
}

const TREND_COLOR: Record<StatTrend["direction"], string> = {
  up: "text-green-600",
  down: "text-red-600",
  flat: "text-slate-500",
};

const TREND_ARROW: Record<StatTrend["direction"], string> = {
  up: "M5 15l7-7 7 7",
  down: "M19 9l-7 7-7-7",
  flat: "M5 12h14",
};

// The Design Language V1 successor to components/KpiCard.tsx — same
// shape (label, value, optional trend), rebuilt on shared tokens. Per
// docs/design-system/06-components.md#kpi-cards: the value is the hero,
// the label recedes to Caption weight, and no more than 4-5 of these
// should ever appear in one row without a grouping heading — a "KPI
// wall" is exactly what this design language avoids.
export default function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: StatTrend;
}) {
  return (
    <div className={`${radius.card} border ${border.hairline} ${surface.card} ${spacing.cardPadding} ${elevation.flat}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${type.caption} ${text.secondary}`}>{label}</p>
        {trend && (
          <span className={`inline-flex items-center gap-1 ${type.caption} ${TREND_COLOR[trend.direction]}`}>
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d={TREND_ARROW[trend.direction]} />
            </svg>
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className={`mt-4 ${type.h1} ${numeric} ${text.onCanvas}`}>{value}</p>
    </div>
  );
}
