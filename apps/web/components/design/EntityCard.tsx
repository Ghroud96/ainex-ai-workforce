import type { ReactNode } from "react";
import { border, surface, text } from "@/lib/design/colors";
import { elevation } from "@/lib/design/elevation";
import { radius } from "@/lib/design/radius";
import { spacing } from "@/lib/design/spacing";
import { type } from "@/lib/design/typography";

// The generic card for "one business entity" — a customer, a deal, a
// worker, an invoice. The shared shape behind today's hand-rolled
// per-entity cards (DecisionCard.tsx, InsightCard.tsx,
// WorkflowStepPanel.tsx's outer chrome): a title, an optional status
// badge, an optional meta line, a details/tags slot, and an optional
// actions row separated by a hairline. See
// docs/design-system/06-components.md#cards.
export default function EntityCard({
  title,
  meta,
  status,
  children,
  actions,
}: {
  title: string;
  meta?: string;
  status?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={`${radius.card} border ${border.hairline} ${surface.card} ${spacing.cardPadding} ${elevation.flat}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`${type.h3} ${text.primary}`}>{title}</p>
          {meta && <p className={`mt-1 ${type.caption} ${text.muted}`}>{meta}</p>}
        </div>
        {status}
      </div>

      {children && <div className="mt-3">{children}</div>}

      {actions && <div className={`mt-4 flex flex-wrap items-center gap-3 border-t ${border.hairline} pt-4`}>{actions}</div>}
    </div>
  );
}
