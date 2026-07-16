import { text } from "@/lib/design/colors";
import { radius } from "@/lib/design/radius";
import { type } from "@/lib/design/typography";

// Per docs/design-system/08-motion.md: no spinners, no bouncing dots. A
// calm skeleton plus a short static caption — loading should feel like
// patience, not urgency. `label` defaults to a generic phrase; pass a
// specific one where it helps ("Preparing your briefing…"). The pulse
// bars use a literal slate-200, not a `surface` token — on the V2 light
// palette both `card` and `raised` are white and `sunken` (slate-50) is
// nearly indistinguishable from the canvas, none of which read as a
// visible loading indicator; a skeleton needs more visible contrast than
// a quiet content surface does.
export default function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="py-6" role="status" aria-live="polite">
      <div className="space-y-3">
        <div className={`h-3 w-2/3 ${radius.control} bg-slate-200 animate-pulse`} />
        <div className={`h-3 w-full ${radius.control} bg-slate-200 animate-pulse`} />
        <div className={`h-3 w-1/2 ${radius.control} bg-slate-200 animate-pulse`} />
      </div>
      <p className={`mt-3 ${type.caption} ${text.muted}`}>{label}</p>
    </div>
  );
}
