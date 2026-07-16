import { accent, surface, text } from "@/lib/design/colors";
import { spacing } from "@/lib/design/spacing";
import { type } from "@/lib/design/typography";

// The quiet, consistent visual signature for anything AINEX itself
// concluded — marked by a left border rule in the Secondary (indigo)
// accent only, never a filled or gradient background. The source line is
// not optional: it's the visual expression of the product's existing
// rule against silently presenting rule-based output as a live model
// call. See docs/design-system/02-visual-principles.md#ai-first-philosophy
// and docs/design-system/06-components.md#ai-recommendation-cards.
export default function AIRecommendationCard({
  recommendation,
  reason,
  source,
}: {
  recommendation: string;
  reason?: string;
  /** e.g. "Rule-based — based on account status and order recency" or "Live AI — gpt-4.1, 3 documents". Always shown. */
  source: string;
}) {
  return (
    <div className={`${surface.sunken} rounded-lg border-l-2 ${accent.secondaryBorder} ${spacing.cardPadding}`}>
      <p className={`${type.eyebrow} ${accent.secondaryText}`}>AINEX Recommendation</p>
      <p className={`mt-2 ${type.body} ${text.primary}`}>{recommendation}</p>
      {reason && <p className={`mt-1 ${type.body} ${text.secondary}`}>{reason}</p>}
      <p className={`mt-3 ${type.caption} ${text.muted}`}>{source}</p>
    </div>
  );
}
