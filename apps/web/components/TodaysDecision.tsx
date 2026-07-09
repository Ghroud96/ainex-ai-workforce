import Link from "next/link";
import { startEnterpriseDemo } from "@/app/demo/actions";
import { getTodaysDecision } from "@/lib/enterprise/EnterpriseDemoEngine";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";

// The one card that narrates the whole Enterprise Demo Experience —
// Decision / Why It Matters / AI Recommendation / Next Action — never a
// "story step," always a real business decision. One component, two
// densities: `full` is the Dashboard's hero (and the pre-start CTA);
// `compact` is the same information wherever it isn't the primary focus
// (the Sales Workspace's featured-opportunity callout), so the same
// explanation never repeats itself on one screen.
export default function TodaysDecision({
  company,
  variant = "full",
  minScreenIndex = 0,
}: {
  company: GeneratedCompany;
  variant?: "full" | "compact";
  minScreenIndex?: number;
}) {
  const snapshot = getTodaysDecision(company, minScreenIndex);

  if (!snapshot) {
    return (
      <div className="rounded-xl bg-slate-900 p-8 text-center">
        <p className="text-lg font-semibold text-white">See how AINEX runs {company.profile.name} today</p>
        <form action={startEnterpriseDemo} className="mt-4">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            ▶ Start Enterprise Demo
          </button>
        </form>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Today&apos;s Decision</p>
        <p className="mt-1 text-sm font-semibold text-white">{snapshot.decision}</p>
        {snapshot.aiRecommendation && (
          <p className="mt-1 text-xs text-slate-400">AI recommends: {snapshot.aiRecommendation}</p>
        )}
        <div className="mt-3">
          <NextActionButton snapshot={snapshot} size="compact" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900 p-8">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Today&apos;s Decision</p>
      <h2 className="mt-2 text-2xl font-bold text-white">{snapshot.decision}</h2>
      <p className="mt-3 text-sm text-slate-300">{snapshot.whyItMatters}</p>
      {snapshot.aiRecommendation && (
        <div className="mt-4 rounded-lg bg-slate-800/60 p-4">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">AI Recommended</p>
          <p className="mt-1 text-sm text-slate-200">{snapshot.aiRecommendation}</p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
        <NextActionButton snapshot={snapshot} size="full" />
        {!snapshot.complete && (
          <span className="text-xs text-slate-500">~{Math.ceil(snapshot.remainingMinutes)} min remaining</span>
        )}
      </div>
    </div>
  );
}

// Every screen but one just navigates onward. The "complete" state is the
// exception — "Start a new demo" isn't a page to visit, it's
// startEnterpriseDemo() firing again, so it needs a real form submit, not
// a Link to somewhere that looks the same as where you already are.
function NextActionButton({
  snapshot,
  size,
}: {
  snapshot: { nextAction: string; nextHref: string; complete: boolean };
  size: "compact" | "full";
}) {
  const className =
    size === "compact"
      ? "inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
      : "rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500";

  if (snapshot.complete) {
    return (
      <form action={startEnterpriseDemo}>
        <button type="submit" className={className}>
          {snapshot.nextAction} →
        </button>
      </form>
    );
  }

  return (
    <Link href={snapshot.nextHref} className={className}>
      {snapshot.nextAction} →
    </Link>
  );
}
