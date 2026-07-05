export interface TimelineEntry {
  time: string;
  title: string;
  subtitle?: string;
  description: string;
  accent?: "default" | "workflow";
}

const ACCENT_CIRCLE: Record<NonNullable<TimelineEntry["accent"]>, string> = {
  default: "bg-blue-600/10 text-blue-400",
  workflow: "bg-purple-600/10 text-purple-400",
};

// A real, connected, chronological timeline — used for both the Digital
// Workforce Activity Center (one entry per worker action) and the
// Cross-Department Collaboration chain (one entry per step in a shared
// investigation) so the app has one timeline visual, not two bespoke ones.
export default function ActivityTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="space-y-0">
      {entries.map((entry, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${ACCENT_CIRCLE[entry.accent ?? "default"]}`}
            >
              {index + 1}
            </span>
            {index < entries.length - 1 && <span className="mt-1 w-px flex-1 bg-slate-800" />}
          </div>
          <div className="pb-5">
            <p className="text-sm font-medium text-white">
              {entry.title}
              {entry.subtitle && <span className="font-normal text-slate-500"> · {entry.subtitle}</span>}
              <span className="font-normal text-slate-500"> · {entry.time}</span>
            </p>
            <p className="mt-1 text-sm text-slate-300">{entry.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
