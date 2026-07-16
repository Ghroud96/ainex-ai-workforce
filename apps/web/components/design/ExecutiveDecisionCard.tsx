import type { ReactNode } from "react";
import { accent, border, surface, text } from "@/lib/design/colors";
import { elevation } from "@/lib/design/elevation";
import { radius } from "@/lib/design/radius";
import { spacing } from "@/lib/design/spacing";
import { type } from "@/lib/design/typography";

// The single most important object type in the system — the visual
// expression of Decision-First Philosophy
// (docs/design-system/02-visual-principles.md#decision-first-philosophy):
// the decision at Display weight, why it matters below it, an optional
// recommendation, then one action. At most one of these should ever be
// visible on a screen at a time — see
// docs/design-system/06-components.md#executive-decision-cards.
//
// Presentational only: `action` accepts any ReactNode (a form, a Link, a
// button) so this component never depends on a specific page's Server
// Action. This generalizes components/TodaysDecision.tsx's "full"
// variant; TodaysDecision is untouched this sprint.
export default function ExecutiveDecisionCard({
  eyebrow = "Today's Decision",
  decision,
  whyItMatters,
  recommendation,
  action,
  meta,
}: {
  eyebrow?: string;
  decision: string;
  whyItMatters: string;
  recommendation?: string;
  action?: ReactNode;
  /** e.g. "~4 min remaining" — small trailing context next to the action. */
  meta?: string;
}) {
  return (
    <div className={`${radius.card} border ${accent.primaryBorder} ${surface.card} ${spacing.cardPadding} ${elevation.flat}`}>
      <p className={`${type.eyebrow} ${text.muted}`}>{eyebrow}</p>
      <h2 className={`mt-2 ${type.display} ${text.onCanvas}`}>{decision}</h2>
      <p className={`mt-3 ${type.body} ${text.secondary}`}>{whyItMatters}</p>

      {recommendation && (
        <div className={`mt-4 rounded-lg ${surface.sunken} p-4`}>
          <p className={`${type.eyebrow} ${text.muted}`}>AI Recommended</p>
          <p className={`mt-1 ${type.body} ${text.primary}`}>{recommendation}</p>
        </div>
      )}

      {(action || meta) && (
        <div className={`mt-6 flex flex-wrap items-center justify-between gap-4 border-t ${border.hairline} pt-4`}>
          {action}
          {meta && <span className={`${type.caption} ${text.muted}`}>{meta}</span>}
        </div>
      )}
    </div>
  );
}
