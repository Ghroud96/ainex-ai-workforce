import ActivityTimeline from "@/components/ActivityTimeline";
import KpiCard from "@/components/KpiCard";
import { buildCompanyStory, computeBusinessHealthScore } from "@/lib/enterprise/BusinessInsights";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { buildCollaborationChain, buildExecutiveKpis, buildRiskAndOpportunityEvents } from "@/lib/enterprise/NarrativeBuilder";

const HEALTH_TONE: Record<string, string> = {
  Strong: "bg-green-500/10 text-green-400",
  Stable: "bg-blue-500/10 text-blue-400",
  "Needs Attention": "bg-amber-500/10 text-amber-400",
  "At Risk": "bg-red-500/10 text-red-400",
};

// A distilled, single-screen version of the Dashboard for board meetings
// and enterprise sales — same underlying data (computeBusinessHealthScore,
// buildExecutiveKpis, buildRiskAndOpportunityEvents, buildCollaborationChain,
// buildCompanyStory), deliberately less of it, presented larger. No new
// data, no new engine — Sidebar.tsx handles hiding the normal navigation
// for this route.
export default function PresentationPage() {
  const { company } = CompanyProfileStore.getCurrent();
  const { profile } = company;
  const healthScore = computeBusinessHealthScore(company);
  const kpis = buildExecutiveKpis(company);
  const { risks, opportunities } = buildRiskAndOpportunityEvents(company);
  const collaboration = buildCollaborationChain(company);
  const story = buildCompanyStory(company);

  return (
    <div className="mx-auto max-w-5xl space-y-12 py-6">
      <div>
        <p className="text-sm font-medium tracking-wide text-slate-500 uppercase">
          {profile.industry} · {profile.size}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-white">{profile.name}</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">{story.situation}</p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-8">
        <p className="text-xl font-semibold text-white">Business Health</p>
        <span className={`inline-flex items-center rounded-full px-5 py-2 text-lg font-semibold ${HEALTH_TONE[healthScore.label]}`}>
          {healthScore.label} ({healthScore.score}/100)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} title={kpi.title} value={kpi.value} trend={kpi.trend} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 p-8">
          <p className="text-sm font-medium tracking-wide text-red-400 uppercase">Top Risk</p>
          <p className="mt-3 text-lg text-slate-100">{risks[0]?.title ?? "None flagged"}</p>
        </div>
        <div className="rounded-2xl border border-green-900/50 bg-green-950/20 p-8">
          <p className="text-sm font-medium tracking-wide text-green-400 uppercase">Top Opportunity</p>
          <p className="mt-3 text-lg text-slate-100">{opportunities[0]?.title ?? "None flagged"}</p>
        </div>
      </div>

      <div>
        <p className="mb-4 text-xl font-semibold text-white">The Digital Workforce solving this together</p>
        <div className="rounded-2xl bg-slate-900 p-8">
          <ActivityTimeline
            entries={collaboration.map((step) => ({
              time: step.time,
              title: step.workerName,
              subtitle: step.roleTitle,
              description: step.message,
              accent: step.workerId === "workflow" ? "workflow" : "default",
            }))}
          />
        </div>
      </div>
    </div>
  );
}
