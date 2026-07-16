import { semantic } from "@/lib/design/colors";
import { radius } from "@/lib/design/radius";
import { type } from "@/lib/design/typography";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

// The one badge primitive for status, priority, and stage labels —
// consolidates the tone-mapping pattern currently hand-rolled per
// component (PriorityBadge.tsx, TagBadge.tsx, DecisionCard.tsx's
// STATUS_TONE, WorkflowStepPanel.tsx's STAGE_TONE). Text + a low-opacity
// tint of the same semantic color, never a solid fill — see
// docs/design-system/06-components.md#badges.
export default function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  const tones = semantic[tone];
  return (
    <span
      className={`inline-flex items-center ${radius.pill} px-3 py-1 ${type.caption} ${tones.text} ${tones.bg}`}
    >
      {label}
    </span>
  );
}
