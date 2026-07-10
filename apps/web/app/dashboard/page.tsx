import ActivityTimeline from "@/components/ActivityTimeline";
import Expandable from "@/components/Expandable";
import InsightCard from "@/components/InsightCard";
import KpiCard from "@/components/KpiCard";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import PageHeader from "@/components/PageHeader";
import PriorityBadge from "@/components/PriorityBadge";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import TeachAinexSessionStats from "@/components/TeachAinexSessionStats";
import TeachAinexWizard from "@/components/TeachAinexWizard";
import TodaysDecision from "@/components/TodaysDecision";
import WorkflowCard from "@/components/WorkflowCard";
import {
  buildRecommendedActions,
  computeBusinessHealthScore,
  enrichBusinessEvent,
  enrichKpi,
} from "@/lib/enterprise/BusinessInsights";
import LiveOnboardingBanner from "@/components/LiveOnboardingBanner";
import { buildCompanyIntelligenceOverview } from "@/lib/company-intelligence/CompanyIntelligenceOverviewBuilder";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { buildSimulatedEventFeed } from "@/lib/enterprise/LiveSimulationBuilder";
import {
  buildCollaborationChain,
  buildExecutiveBrief,
  buildExecutiveKpis,
  buildRiskAndOpportunityEvents,
  buildUpcomingEvents,
  buildWorkforceActivityFeed,
} from "@/lib/enterprise/NarrativeBuilder";
import { WorkflowService } from "@/lib/workflow/WorkflowService";

const HEALTH_TONE: Record<string, string> = {
  Strong: "bg-green-500/10 text-green-400",
  Stable: "bg-blue-500/10 text-blue-400",
  "Needs Attention": "bg-amber-500/10 text-amber-400",
  "At Risk": "bg-red-500/10 text-red-400",
};

export default function DashboardPage() {
  const { company } = CompanyProfileStore.getCurrent();
  const { profile } = company;

  const brief = buildExecutiveBrief(company);
  const kpis = buildExecutiveKpis(company).map((kpi) => enrichKpi(kpi, company));
  const { risks, opportunities } = buildRiskAndOpportunityEvents(company);
  const enrichedRisks = risks.map((event) => enrichBusinessEvent(event));
  const enrichedOpportunities = opportunities.map((event) => enrichBusinessEvent(event));
  const upcomingEvents = buildUpcomingEvents(company);
  const activityFeed = buildWorkforceActivityFeed(company);
  const collaboration = buildCollaborationChain(company);
  const approvalsRequired = WorkflowService.approvalsRequired();
  const healthScore = computeBusinessHealthScore(company);
  const recommendedActions = buildRecommendedActions(company);
  const simulatedEvents = buildSimulatedEventFeed(company);

  const intelligence = buildCompanyIntelligenceOverview();
  // A freshly empty Live Company (no employees invited yet) is the signal
  // for the onboarding banner — the same "is this company actually empty"
  // check used throughout this page for the KPI/tile empty-state values.
  const isFreshLiveCompany = !CompanyModeStore.isDemoModeEnabled() && company.enterpriseUsers.length === 0;

  return (
    <>
      <PageHeader
        title="Executive Intelligence"
        description={`${profile.name} · ${profile.industry} · ${profile.size} — your Digital Workforce's live view of company health, already working before you opened this page.`}
      />

      {isFreshLiveCompany && (
        <div className="mt-6">
          <LiveOnboardingBanner />
        </div>
      )}

      {/* Today's Decision — the true hero: the Enterprise Demo Experience's
          entry point (before a demo starts) and its ongoing narration
          (once one has). See components/TodaysDecision.tsx. */}
      <div className="mt-6">
        <TodaysDecision company={company} />
      </div>

      {/* Morning Executive Brief — company-wide context, now demoted below
          Today's Decision: more meaningful once the hero has already shown
          "your Digital Workforce already did this." */}
      <section className="mt-10 rounded-xl bg-slate-900 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Morning Executive Brief</h2>
          <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ${HEALTH_TONE[healthScore.label]}`}>
            Business Health: {healthScore.label} ({healthScore.score}/100)
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Today&apos;s Summary</p>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              {brief.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Recommended Actions</p>
            <div className="mt-3 space-y-2">
              {recommendedActions.map((action, index) => (
                <div key={index} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 p-3">
                  <div>
                    <p className="text-sm text-slate-200">{action.text}</p>
                    <p className="mt-1 text-xs text-slate-500">Owner: {action.responsibleWorkerName}</p>
                  </div>
                  <PriorityBadge priority={action.priority} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Top Risk</p>
            <p className="mt-1 text-sm text-slate-200">{risks[0]?.title ?? "None flagged"}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Top Opportunity</p>
            <p className="mt-1 text-sm text-slate-200">{opportunities[0]?.title ?? "None flagged"}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Completed Today</p>
            <p className="mt-1 text-sm text-slate-200">{activityFeed.length} work items</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Pending Approvals</p>
            <p className="mt-1 text-sm text-slate-200">{approvalsRequired.length} awaiting sign-off</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Live Company Simulation"
          description="A live stream of the kind of events this Digital Workforce reacts to as they happen."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <LiveActivityTicker events={simulatedEvents} />
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Business at a Glance" description="The numbers behind this morning's brief." />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.title} className="flex flex-col">
              <KpiCard title={kpi.title} value={kpi.value} trend={kpi.trend} />
              {kpi.whyChanged && <p className="mt-2 px-1 text-xs text-slate-500">{kpi.whyChanged}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Company Intelligence"
          description="How much of the company's own knowledge is captured and ready for the Digital Workforce to draw on."
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Knowledge Coverage" value={intelligence.totalDocuments === 0 ? "No data yet" : `${intelligence.coverageScore}/100`} />
          <KpiCard title="Documents Uploaded" value={intelligence.totalDocuments === 0 ? "No documents uploaded" : String(intelligence.totalDocuments)} />
          <KpiCard title="Departments Ready" value={`${intelligence.knowledgeReadyDepartments.length} of ${intelligence.departmentCoverage.length}`} />
          <KpiCard title="Recently Added" value={String(intelligence.recentlyUploaded.length)} />
        </div>
      </section>

      <section className="mt-10 rounded-xl bg-slate-900 p-8">
        <SectionTitle
          title="Experience AINEX with Your Company"
          description="You've seen the Demo Company. Now share one real document from your own — AINEX learns it live."
        />
        <TeachAinexWizard />
        <div className="mt-4">
          <TeachAinexSessionStats />
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Digital Workforce Activity Center"
          description="Every Digital Worker's work today, in order — not waiting to be asked."
        />
        <Expandable summary={`View all ${activityFeed.length} activity items`}>
          <div className="rounded-xl bg-slate-900 p-6">
            <ActivityTimeline
              entries={activityFeed.map((entry) => ({ time: entry.time, title: entry.workerName, description: entry.text }))}
            />
          </div>
        </Expandable>
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Cross-Department Collaboration"
          description="A live example of the Digital Workforce solving a problem together, this morning."
        />
        {collaboration.length === 0 ? (
          <p className="text-sm text-slate-500">
            No collaboration activity yet — invite employees and add customers to see the Digital Workforce work together.
          </p>
        ) : (
          <Expandable summary={`See how ${collaboration.length} Digital Workers worked this case together`}>
            <div className="rounded-xl bg-slate-900 p-6">
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
          </Expandable>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Business Risks & Opportunities"
          description="Every event includes the business impact, affected departments, priority, and who's already on it."
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-red-400 uppercase">Risks</p>
            <div className="space-y-3">
              {enrichedRisks.length === 0 ? (
                <p className="text-sm text-slate-500">No risks flagged today.</p>
              ) : (
                enrichedRisks.map((event) => <InsightCard key={event.id} event={event} />)
              )}
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-green-400 uppercase">Opportunities</p>
            <div className="space-y-3">
              {enrichedOpportunities.length === 0 ? (
                <p className="text-sm text-slate-500">No opportunities flagged today.</p>
              ) : (
                enrichedOpportunities.map((event) => <InsightCard key={event.id} event={event} />)
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle
          title="Pending Approvals"
          description="Workflow Automation runs waiting on human approval before they execute."
        />
        {approvalsRequired.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing is waiting on approval right now.</p>
        ) : (
          <div className="space-y-2">
            {approvalsRequired.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-200">{WorkflowService.getById(run.workflowId)?.name ?? run.workflowId}</p>
                  <p className="mt-1 text-xs text-slate-500">Requested by {run.triggeredBy} · {run.startedAt}</p>
                </div>
                <TagBadge label={run.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle title="Upcoming Events" description="Milestones and operational updates on the near-term horizon." />
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled.</p>
        ) : (
          <Expandable summary={`View all ${upcomingEvents.length} events`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <WorkflowCard key={event.id} name={event.title} description={event.date} />
              ))}
            </div>
          </Expandable>
        )}
      </section>
    </>
  );
}
