import { accent, text } from "@/lib/design/colors";
import { type } from "@/lib/design/typography";

export type TimelineAccent = "default" | "workflow";

const ACCENT_CIRCLE: Record<TimelineAccent, string> = {
  default: `bg-blue-50 ${accent.primaryText}`,
  workflow: `bg-indigo-50 ${accent.secondaryText}`,
};

// A single timeline entry — marker, connector, title, description — the
// atomic unit behind components/ActivityTimeline.tsx's rendering. Time is
// deliberately de-emphasized to Caption weight: the narrative matters
// more than the exact timestamp. See
// docs/design-system/06-components.md#timeline. `isLast` omits the
// connector line for the final entry in a list.
export default function TimelineCard({
  title,
  subtitle,
  time,
  description,
  accent: accentVariant = "default",
  isLast = false,
}: {
  title: string;
  subtitle?: string;
  time: string;
  description: string;
  accent?: TimelineAccent;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${type.caption} ${ACCENT_CIRCLE[accentVariant]}`}>
          •
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>
      <div className="pb-5">
        <p className={`${type.body} font-medium ${text.primary}`}>
          {title}
          {subtitle && <span className={`font-normal ${text.muted}`}> · {subtitle}</span>}
          <span className={`font-normal ${text.muted}`}> · {time}</span>
        </p>
        <p className={`mt-1 ${type.body} ${text.secondary}`}>{description}</p>
      </div>
    </div>
  );
}
