import type { ReactNode } from "react";
import StatusBadge, { type StatusTone } from "@/components/design/StatusBadge";
import { border, surface, text } from "@/lib/design/colors";
import { elevation } from "@/lib/design/elevation";
import { radius } from "@/lib/design/radius";
import { spacing } from "@/lib/design/spacing";
import { type } from "@/lib/design/typography";

// The generalized shape behind a "who/what needs attention today" row —
// modeled on the Sales Workspace's Today's Priorities pattern, written
// department-agnostically so a future Finance/HR/Inventory priority queue
// can reuse it. Not wired into any page this sprint. See
// docs/design-system/06-components.md.
export default function PriorityCard({
  title,
  priorityLabel,
  priorityTone = "neutral",
  reason,
  recommendation,
  details,
  actions,
}: {
  title: string;
  priorityLabel: string;
  priorityTone?: StatusTone;
  reason: string;
  /** The AI Recommendation line — see docs/design-system/06-components.md#ai-recommendation-cards for the honesty requirement this text should follow. */
  recommendation?: string;
  /** Tag row — opportunity value, last interaction, suggested action, etc. */
  details?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={`${radius.card} border ${border.hairline} ${surface.card} ${spacing.cardPadding} ${elevation.flat}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={`${type.h3} ${text.primary}`}>{title}</p>
          <p className={`mt-1 ${type.caption} ${text.muted}`}>{reason}</p>
        </div>
        <StatusBadge label={priorityLabel} tone={priorityTone} />
      </div>

      {recommendation && (
        <div className={`mt-3 rounded-lg ${surface.sunken} p-3`}>
          <p className={`${type.eyebrow} ${text.muted}`}>AINEX Recommendation</p>
          <p className={`mt-1 ${type.body} ${text.secondary}`}>{recommendation}</p>
        </div>
      )}

      {details && <div className="mt-3 flex flex-wrap items-center gap-2">{details}</div>}
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
