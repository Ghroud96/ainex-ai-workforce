import Link from "next/link";
import { startEnterpriseDemo } from "@/app/demo/actions";
import Expandable from "@/components/Expandable";
import InsightCard from "@/components/InsightCard";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import LiveOnboardingBanner from "@/components/LiveOnboardingBanner";
import TeachAinexSessionStats from "@/components/TeachAinexSessionStats";
import TeachAinexWizard from "@/components/TeachAinexWizard";
import WorkflowCard from "@/components/WorkflowCard";
import ActionButton from "@/components/design/ActionButton";
import AIRecommendationCard from "@/components/design/AIRecommendationCard";
import EmptyState from "@/components/design/EmptyState";
import EntityCard from "@/components/design/EntityCard";
import ExecutiveDecisionCard from "@/components/design/ExecutiveDecisionCard";
import PageHeader from "@/components/design/PageHeader";
import PageSection from "@/components/design/PageSection";
import StatCard from "@/components/design/StatCard";
import StatusBadge, { type StatusTone } from "@/components/design/StatusBadge";
import TimelineCard from "@/components/design/TimelineCard";
import {
  buildRecommendedActions,
  computeBusinessHealthScore,
  enrichBusinessEvent,
  enrichKpi,
  type PriorityLevel,
} from "@/lib/enterprise/BusinessInsights";
import { buildCompanyIntelligenceOverview } from "@/lib/company-intelligence/CompanyIntelligenceOverviewBuilder";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { getTodaysDecision } from "@/lib/enterprise/EnterpriseDemoEngine";
import { buildSimulatedEventFeed } from "@/lib/enterprise/LiveSimulationBuilder";
import {
  buildCollaborationChain,
  buildExecutiveBrief,
  buildExecutiveKpis,
  buildRiskAndOpportunityEvents,
  buildUpcomingEvents,
  buildWorkforceActivityFeed,
} from "@/lib/enterprise/NarrativeBuilder";
import { accent, surface, text } from "@/lib/design/colors";
import { radius } from "@/lib/design/radius";
import { transition } from "@/lib/design/motion";
import { type } from "@/lib/design/typography";
import { WorkflowService } from "@/lib/workflow/WorkflowService";

// Design Language V1 primitives replace the page's previous ad hoc
// Tailwind combinations (see docs/sprints/sprint-03.md for the token/
// primitive foundation this builds on). No business logic, data source,
// store, or service changed — every builder call below is identical to
// the pre-migration page; only how each result is rendered changed.
const HEALTH_TONE: Record<string, StatusTone> = {
  Strong: "success",
  Stable: "info",
  "Needs Attention": "warning",
  "At Risk": "danger",
};

const PRIORITY_TONE: Record<PriorityLevel, StatusTone> = {
  Critical: "danger",
  High: "warning",
  Medium: "info",
  Low: "neutral",
};

// Matches ActionButton's own "primary" class composition (see
// components/design/ActionButton.tsx) — reused here only because
// ActionButton itself renders a <button>, and this one CTA sometimes
// needs to be a Link instead of a form submit. Built entirely from
// design tokens, not new raw Tailwind.
const PRIMARY_LINK_CLASS = `${radius.control} px-4 py-2 text-sm font-medium ${transition.colors} ${accent.primaryBg} ${accent.primaryBgHover} text-white`;

export default function DashboardPage() {
  const { company } = CompanyProfileStore.getCurrent();
  const { profile } = company;

  const decision = getTodaysDecision(company);
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
  const isFreshLiveCompany = !CompanyModeStore.isDemoModeEnabled() && company.enterpriseUsers.length === 0;

  return (
    <>
      <PageHeader
        title="Executive Intelligence"
        description={`${profile.name} · ${profile.industry} · ${profile.size} — your Digital Workforce's live view of company health, already working before you opened this page.`}
      />

      {isFreshLiveCompany && (
        <div className="mb-12">
          <LiveOnboardingBanner />
        </div>
      )}

      {/* 1. Today's Executive Decision — the one hero moment on the page. */}
      <PageSection>
        {decision ? (
          <ExecutiveDecisionCard
            decision={decision.decision}
            whyItMatters={decision.whyItMatters}
            recommendation={decision.aiRecommendation ?? undefined}
            meta={!decision.complete ? `~${Math.ceil(decision.remainingMinutes)} min remaining` : undefined}
            action={
              decision.complete ? (
                <form action={startEnterpriseDemo}>
                  <ActionButton type="submit" variant="primary">
                    {decision.nextAction} →
                  </ActionButton>
                </form>
              ) : (
                <Link href={decision.nextHref} className={PRIMARY_LINK_CLASS}>
                  {decision.nextAction} →
                </Link>
              )
            }
          />
        ) : (
          <ExecutiveDecisionCard
            decision={`See how AINEX runs ${profile.name} today`}
            whyItMatters="Start the guided walkthrough to see AINEX operate this company end-to-end, from a Sales follow-up through Manager and Finance approval."
            action={
              <form action={startEnterpriseDemo}>
                <ActionButton type="submit" variant="primary">
                  ▶ Start Enterprise Demo
                </ActionButton>
              </form>
            }
          />
        )}
      </PageSection>

      {/* 2. Business Health — the health score plus the numbers behind it, one section instead of two. */}
      <PageSection
        title="Business Health"
        description="The numbers behind this morning's brief."
        actions={<StatusBadge label={`${healthScore.label} · ${healthScore.score}/100`} tone={HEALTH_TONE[healthScore.label]} />}
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.title}>
              <StatCard label={kpi.title} value={kpi.value} trend={kpi.trend} />
              {kpi.whyChanged && <p className={`mt-2 px-1 ${type.caption} ${text.muted}`}>{kpi.whyChanged}</p>}
            </div>
          ))}
        </div>
      </PageSection>

      {/* 3. Today's Work — what AINEX recommends, and why, then the full action list. */}
      <PageSection
        title="Today's Work"
        description={`${activityFeed.length} work item${activityFeed.length === 1 ? "" : "s"} completed by the Digital Workforce so far today.`}
      >
        <AIRecommendationCard
          recommendation={recommendedActions[0]?.text ?? "No actions need attention right now."}
          reason="AINEX's highest-priority recommendation, drawn from today's overdue invoices, stock levels, at-risk accounts, and open tickets."
          source="Rule-based recommendation — no live model call"
        />

        <div className="mt-4 space-y-2">
          {brief.map((line, index) => (
            <p key={index} className={`${type.body} ${text.secondary}`}>
              {line}
            </p>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          {recommendedActions.map((action, index) => (
            <EntityCard
              key={index}
              title={action.text}
              meta={`Owner: ${action.responsibleWorkerName}`}
              status={<StatusBadge label={action.priority} tone={PRIORITY_TONE[action.priority]} />}
            />
          ))}
        </div>
      </PageSection>

      {/* 4. Approvals Requiring Attention. */}
      <PageSection
        title="Approvals Requiring Attention"
        description="Workflow Automation runs waiting on human approval before they execute."
      >
        {approvalsRequired.length === 0 ? (
          <EmptyState title="Nothing is waiting on approval right now." />
        ) : (
          <div className="space-y-3">
            {approvalsRequired.map((run) => (
              <EntityCard
                key={run.id}
                title={WorkflowService.getById(run.workflowId)?.name ?? run.workflowId}
                meta={`Requested by ${run.triggeredBy} · ${run.startedAt}`}
                status={<StatusBadge label={run.status} tone="warning" />}
              />
            ))}
          </div>
        )}
      </PageSection>

      {/* 5. Recent Company Activity — Digital Workforce activity and cross-department collaboration, consolidated into one timeline instead of two. */}
      <PageSection
        title="Recent Company Activity"
        description="Every Digital Worker's work today, and how they collaborated, in order."
      >
        {activityFeed.length === 0 ? (
          <EmptyState title="No activity recorded yet." />
        ) : (
          <div className={`${radius.card} ${surface.card} p-6`}>
            {activityFeed.slice(0, 5).map((entry, index, visible) => (
              <TimelineCard
                key={index}
                title={entry.workerName}
                time={entry.time}
                description={entry.text}
                isLast={index === visible.length - 1 && activityFeed.length <= 5}
              />
            ))}
            {activityFeed.length > 5 && (
              <Expandable summary={`View all ${activityFeed.length} activity items`}>
                {activityFeed.slice(5).map((entry, index, rest) => (
                  <TimelineCard
                    key={index}
                    title={entry.workerName}
                    time={entry.time}
                    description={entry.text}
                    isLast={index === rest.length - 1}
                  />
                ))}
              </Expandable>
            )}
          </div>
        )}

        {collaboration.length > 0 && (
          <div className="mt-6">
            <p className={`mb-3 ${type.eyebrow} ${text.muted}`}>Cross-Department Collaboration</p>
            <div className={`${radius.card} ${surface.card} p-6`}>
              {collaboration.map((step, index, all) => (
                <TimelineCard
                  key={index}
                  title={step.workerName}
                  subtitle={step.roleTitle}
                  time={step.time}
                  description={step.message}
                  accent={step.workerId === "workflow" ? "workflow" : "default"}
                  isLast={index === all.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </PageSection>

      {/* Supporting information — everything below is secondary to the five sections above. */}

      <PageSection
        title="Company Intelligence"
        description="How much of the company's own knowledge is captured and ready for the Digital Workforce to draw on."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Knowledge Coverage" value={intelligence.totalDocuments === 0 ? "No data yet" : `${intelligence.coverageScore}/100`} />
          <StatCard label="Documents Uploaded" value={intelligence.totalDocuments === 0 ? "No documents uploaded" : String(intelligence.totalDocuments)} />
          <StatCard label="Departments Ready" value={`${intelligence.knowledgeReadyDepartments.length} of ${intelligence.departmentCoverage.length}`} />
          <StatCard label="Recently Added" value={String(intelligence.recentlyUploaded.length)} />
        </div>
      </PageSection>

      <PageSection
        title="Business Risks & Opportunities"
        description="Every event includes the business impact, affected departments, priority, and who's already on it."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className={`mb-3 ${type.eyebrow} text-red-400`}>Risks</p>
            {enrichedRisks.length === 0 ? (
              <EmptyState title="No risks flagged today." />
            ) : (
              <div className="space-y-3">
                {enrichedRisks.map((event) => (
                  <InsightCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
          <div>
            <p className={`mb-3 ${type.eyebrow} text-green-400`}>Opportunities</p>
            {enrichedOpportunities.length === 0 ? (
              <EmptyState title="No opportunities flagged today." />
            ) : (
              <div className="space-y-3">
                {enrichedOpportunities.map((event) => (
                  <InsightCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageSection>

      <PageSection
        title="Upcoming Events"
        description="Milestones and operational updates on the near-term horizon."
      >
        {upcomingEvents.length === 0 ? (
          <EmptyState title="Nothing scheduled." />
        ) : (
          <Expandable summary={`View all ${upcomingEvents.length} events`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {upcomingEvents.map((event) => (
                <WorkflowCard key={event.id} name={event.title} description={event.date} />
              ))}
            </div>
          </Expandable>
        )}
      </PageSection>

      <PageSection
        title="Live Company Simulation"
        description="A live stream of the kind of events this Digital Workforce reacts to as they happen."
      >
        <div className={`${radius.card} ${surface.card} p-6`}>
          <LiveActivityTicker events={simulatedEvents} />
        </div>
      </PageSection>

      <PageSection
        title="Experience AINEX with Your Company"
        description="You've seen the Demo Company. Now share one real document from your own — AINEX learns it live."
      >
        <div className={`${radius.card} ${surface.card} p-6`}>
          <TeachAinexWizard />
          <div className="mt-4">
            <TeachAinexSessionStats />
          </div>
        </div>
      </PageSection>
    </>
  );
}
