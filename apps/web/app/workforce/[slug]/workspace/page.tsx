import Link from "next/link";
import { notFound } from "next/navigation";
import Expandable from "@/components/Expandable";
import ExecutionRestrictedNotice from "@/components/ExecutionRestrictedNotice";
import FollowUpExecutionDialog from "@/components/sales/FollowUpExecutionDialog";
import TagBadge from "@/components/TagBadge";
import TodaysDecision from "@/components/TodaysDecision";
import WorkflowStepPanel from "@/components/WorkflowStepPanel";
import ActionButton from "@/components/design/ActionButton";
import EmptyState from "@/components/design/EmptyState";
import PageSection from "@/components/design/PageSection";
import PriorityCard from "@/components/design/PriorityCard";
import StatCard from "@/components/design/StatCard";
import StatusBadge, { type StatusTone } from "@/components/design/StatusBadge";
import TimelineCard, { type TimelineAccent } from "@/components/design/TimelineCard";
import { analyzeDocumentAsWorker } from "@/app/workforce/aiActions";
import { startWork } from "@/app/workforce/dealActions";
import { executeSalesFollowUp } from "@/app/workforce/executionActions";
import { getAllDocuments, type DigitalDocument } from "@/data/documents";
import type { PriorityLevel } from "@/lib/enterprise/BusinessInsights";
import { buildCompanyTimeline, toTimelineEntry } from "@/lib/enterprise/CompanyTimeline";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import { EnterpriseDemoStore } from "@/lib/enterprise/EnterpriseDemoStore";
import { canAccessWorker, type DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { buildCollaborationChain, buildTodaysActivity } from "@/lib/enterprise/NarrativeBuilder";
import { isPresentingAs } from "@/lib/enterprise/PresentationModeStore";
import { accent, surface, text } from "@/lib/design/colors";
import { radius } from "@/lib/design/radius";
import { transition } from "@/lib/design/motion";
import { type } from "@/lib/design/typography";
import { getTodaysPriorities, type PriorityCustomerRow } from "@/lib/sales/PriorityEngine";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG, type SalesDeal } from "@/lib/sales/SalesDealTypes";
import { buildFollowUpMessage } from "@/lib/sales/execution/SalesFollowUpMessage";
import { SalesFollowUpExecutionStore } from "@/lib/sales/execution/SalesFollowUpExecutionStore";
import { WORKER_ANALYSIS_GROUPING } from "@/lib/services/knowledge/WorkerAnalysisGrouping";
import { WorkerAnalysisResultStore } from "@/lib/services/knowledge/WorkerAnalysisResultStore";
import type { PersonaId, WorkerAnalysisResult } from "@/lib/services/knowledge/WorkerAnalysisService";
import { WorkforceService } from "@/services/workforce/WorkforceService";

// "sales" deliberately excluded — its Worker AI Analysis section is
// replaced entirely by the Sales Workspace (Today's Priorities + connected
// deal workflow) below, per Enterprise Demo V1.
const AI_ANALYSIS_PERSONA_IDS: readonly string[] = ["executive", "finance", "inventory", "hr"];

const PRIORITY_TONE: Record<PriorityLevel, StatusTone> = {
  Critical: "danger",
  High: "warning",
  Medium: "info",
  Low: "neutral",
};

// Matches ActionButton's own "secondary" class composition (see
// components/design/ActionButton.tsx) — needed here only because
// ActionButton renders a <button>, and "Continue Work" is an anchor link.
// Built entirely from design tokens.
const SECONDARY_LINK_CLASS = `${radius.control} px-4 py-2 text-sm font-medium ${transition.colors} bg-slate-800 ${text.primary} hover:bg-slate-700`;

// The Workspace page answers exactly one question: "What should I do
// today?" — nothing else. No architecture, no memory, no execution logs,
// no reasoning (that all lives on the Intelligence sibling page).
export default async function WorkerWorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workerInstance = WorkforceService.getById(slug);

  if (!workerInstance) {
    notFound();
  }

  const worker = WorkforceService.toCardData(workerInstance);
  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);
  // View access is universal (Overview is always visible) — this only
  // gates whether Worker AI Analysis / deal actions further down can
  // actually be executed by the current simulated user.
  const hasExecuteAccess =
    canAccessWorker(currentUser, workerInstance.id as DepartmentWorkerId) || CompanyModeStore.isDemoModeEnabled();

  // Real role, OR the "Presenting:" lens — which is only ever non-null in
  // Demo Mode (see lib/enterprise/PresentationModeStore.ts). Live Company
  // always resolves the real logged-in user's real role; no blanket
  // isDemoModeEnabled() bypass reaches Manager/Finance authorization
  // anymore.
  const isSalesManager =
    (currentUser.departmentWorkerId === "sales" && currentUser.roleLevel !== "Staff") || isPresentingAs("sales-manager");
  const isFinanceUser = currentUser.departmentWorkerId === "finance" || isPresentingAs("finance");

  const todaysPriorities = workerInstance.id === "sales" ? getTodaysPriorities(company, currentUser) : [];
  const allDeals = workerInstance.id === "sales" || workerInstance.id === "finance" ? SalesDealStore.listFor(company) : [];
  // Demo-mode bypassed so a presenter driving the featured opportunity
  // through its Sales-Rep-owned stages doesn't need to switch to that
  // deal's actual owner first — this only affects which deals are
  // *visible* in Current Work, never who can act on them (canAct, on
  // DealPanel below, never bypasses real ownership).
  const myDeals = workerInstance.id === "sales"
    ? allDeals.filter((deal) => deal.ownerUserId === currentUser.id || CompanyModeStore.isDemoModeEnabled())
    : [];
  // The Enterprise Demo Experience's one featured opportunity — leads
  // Current Work on its own, everything else collapses behind Expandable.
  // See lib/enterprise/EnterpriseDemoEngine.ts.
  const featuredDealId = EnterpriseDemoStore.getFeaturedDealId();
  const featuredDeal = featuredDealId ? myDeals.find((deal) => deal.id === featuredDealId) : undefined;
  const otherDeals = featuredDeal ? myDeals.filter((deal) => deal.id !== featuredDealId) : myDeals;
  const dealsAwaitingManager = workerInstance.id === "sales" && isSalesManager
    ? allDeals.filter((deal) => deal.stage === "pending-manager-approval")
    : [];
  const dealsAwaitingFinance =
    workerInstance.id === "finance" ? allDeals.filter((deal) => deal.stage === "pending-finance-review") : [];

  // Business Health summary — "what do I need to work on today," computed
  // from data already derived above. Zero AI, orthogonal to Company Mode
  // (read-only counts, not gated actions).
  const todayIso = new Date().toISOString().slice(0, 10);
  const urgentCustomerCount = todaysPriorities.filter(
    (row) => row.priority === "Critical" || row.priority === "High",
  ).length;
  const customersNeedingFollowUp = myDeals.filter((deal) => deal.stage === "follow-up-needed").length;
  const meetingsToday = currentUser.assignedMeetings.filter((meeting) => meeting.date === todayIso).length;
  const pendingQuotations = myDeals.filter((deal) => deal.stage === "quotation-drafted").length;
  const pendingSalesOrders = myDeals.filter((deal) =>
    ["order-drafted", "pending-manager-approval", "revision-requested", "pending-finance-review"].includes(deal.stage),
  ).length;

  const todaysActivity = buildTodaysActivity(workerInstance.id, company);
  const collaborationStep = buildCollaborationChain(company).find((step) => step.workerId === workerInstance.id);

  // Company Timeline — real product data (lib/enterprise/CompanyTimeline.ts),
  // not demo-only. Sales is its only real source today; Finance reads the
  // same feed rather than maintaining a separate one.
  const recentActivity =
    workerInstance.id === "sales" || workerInstance.id === "finance"
      ? buildCompanyTimeline(company)
          .slice(0, 15)
          .map((event) => toTimelineEntry(event, company))
      : [];

  return (
    <>
      <PageSection title="Today's Work" description={`What the ${worker.name} has already done this morning.`}>
        <div className={`${radius.card} ${surface.card} p-6`}>
          <div className="space-y-3">
            {todaysActivity.map((item, index) => (
              <div key={index} className="flex gap-3">
                <span className={`mt-0.5 shrink-0 ${type.caption} ${text.muted}`}>{item.time}</span>
                <p className={`${type.body} ${text.primary}`}>{item.text}</p>
              </div>
            ))}
          </div>
          {collaborationStep && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className={`${type.eyebrow} ${accent.primaryText}`}>Cross-Department Collaboration</p>
              <p className={`mt-2 ${type.body} ${text.secondary}`}>{collaborationStep.message}</p>
            </div>
          )}
        </div>
      </PageSection>

      {workerInstance.id === "sales" && (
        <>
          {/* 1. Today's Priorities — the hero: who needs attention, why, and what to do. */}
          <PageSection
            title="Today's Priorities"
            description="Who to work on today — ranked automatically from real account data."
          >
            {!hasExecuteAccess ? (
              <ExecutionRestrictedNotice />
            ) : todaysPriorities.length === 0 ? (
              <EmptyState title="No customers yet." description="Import customers or connect CRM." />
            ) : (
              <>
                <div className="space-y-3">
                  {todaysPriorities.slice(0, 3).map((row) => (
                    <SalesPriorityCard
                      key={row.customer.id}
                      row={row}
                      canExecute={hasExecuteAccess}
                      currentUserId={currentUser.id}
                      company={company}
                    />
                  ))}
                </div>
                {todaysPriorities.length > 3 && (
                  <div className="mt-3">
                    <Expandable summary={`View all ${todaysPriorities.length} priorities`}>
                      <div className="space-y-3">
                        {todaysPriorities.slice(3).map((row) => (
                          <SalesPriorityCard
                            key={row.customer.id}
                            row={row}
                            canExecute={hasExecuteAccess}
                            currentUserId={currentUser.id}
                            company={company}
                          />
                        ))}
                      </div>
                    </Expandable>
                  </div>
                )}
              </>
            )}
          </PageSection>

          {/* 2. Current Work — deals already in motion. */}
          <PageSection
            title="Current Work"
            description="Every step may optionally use AI. Review each result before continuing — AI assists, you decide."
          >
            {!hasExecuteAccess ? (
              <ExecutionRestrictedNotice />
            ) : (
              <div className="space-y-4">
                <TodaysDecision company={company} variant="compact" minScreenIndex={1} />
                {myDeals.length === 0 ? (
                  <EmptyState title="No active deals right now." />
                ) : featuredDeal ? (
                  <>
                    <DealPanel company={company} deal={featuredDeal} currentUserId={currentUser.id} />
                    {otherDeals.length > 0 && (
                      <Expandable summary={`View other ${otherDeals.length} deal${otherDeals.length === 1 ? "" : "s"}`}>
                        <div className="space-y-4">
                          {otherDeals.map((deal) => (
                            <DealPanel key={deal.id} company={company} deal={deal} currentUserId={currentUser.id} />
                          ))}
                        </div>
                      </Expandable>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    {myDeals.map((deal) => (
                      <DealPanel key={deal.id} company={company} deal={deal} currentUserId={currentUser.id} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </PageSection>

          {/* 3. Approvals Waiting — read-only unless the current role (real
              or "Presenting:") can act; WorkflowStepPanel's own canAct gate
              is the single source of truth for that, untouched this sprint. */}
          {isSalesManager && (
            <PageSection
              title="Approvals Waiting"
              description="Sales orders from your team awaiting your decision."
              actions={
                isPresentingAs("sales-manager") ? <StatusBadge label="Presenting: Sales Manager View" tone="info" /> : undefined
              }
            >
              <div id="manager-approval">
                {dealsAwaitingManager.length === 0 ? (
                  <EmptyState title="Nothing is awaiting your approval right now." />
                ) : (
                  <div className="space-y-4">
                    {dealsAwaitingManager.map((deal) => {
                      const customer = company.customers.find((c) => c.id === deal.customerId);
                      const owner = company.enterpriseUsers.find((u) => u.id === deal.ownerUserId);
                      return (
                        <WorkflowStepPanel
                          key={deal.id}
                          deal={deal}
                          customerName={customer?.name ?? "Unknown customer"}
                          ownerName={owner?.name ?? "Unknown"}
                          canAct
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </PageSection>
          )}

          {/* 4. Company Timeline — recent work across the company. */}
          <CompanyTimelineSection entries={recentActivity} />

          {/* 5. Supporting Information — the rep's own book at a glance. */}
          <PageSection
            title="Business Health"
            description="What needs your attention right now — computed from your own accounts and deals, no AI involved."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Priority Customers" value={urgentCustomerCount.toString()} />
              <StatCard label="Customers Requiring Follow-up" value={customersNeedingFollowUp.toString()} />
              <StatCard label="Meetings Today" value={meetingsToday.toString()} />
              <StatCard label="Pending Quotations" value={pendingQuotations.toString()} />
              <StatCard label="Pending Sales Orders" value={pendingSalesOrders.toString()} />
            </div>
          </PageSection>
        </>
      )}

      {workerInstance.id === "finance" && (
        <>
          <PageSection
            title="Finance Review"
            description="Approved sales orders awaiting finance sign-off before the order is confirmed."
            actions={isPresentingAs("finance") ? <StatusBadge label="Presenting: Finance View" tone="info" /> : undefined}
          >
            {!hasExecuteAccess ? (
              <ExecutionRestrictedNotice />
            ) : (
              <div className="space-y-4">
                <TodaysDecision company={company} variant="compact" minScreenIndex={2} />
                {dealsAwaitingFinance.length === 0 ? (
                  <EmptyState title="Nothing is awaiting finance review right now." />
                ) : (
                  dealsAwaitingFinance.map((deal) => {
                    const customer = company.customers.find((c) => c.id === deal.customerId);
                    const owner = company.enterpriseUsers.find((u) => u.id === deal.ownerUserId);
                    return (
                      <WorkflowStepPanel
                        key={deal.id}
                        deal={deal}
                        customerName={customer?.name ?? "Unknown customer"}
                        ownerName={owner?.name ?? "Unknown"}
                        canAct={isFinanceUser}
                      />
                    );
                  })
                )}
              </div>
            )}
          </PageSection>

          <CompanyTimelineSection entries={recentActivity} />
        </>
      )}

      {AI_ANALYSIS_PERSONA_IDS.includes(workerInstance.id) && (
        <section>
          <PageSection
            title="Run AI"
            description={`Business actions ${worker.name} can take on this opportunity right now.`}
          >
            {hasExecuteAccess ? (
              <div className="space-y-6">
                <WorkerAiAnalysisBlock
                  personaId={workerInstance.id as PersonaId}
                  personaLabel={worker.name}
                  workerId={workerInstance.id}
                  documents={getAllDocuments()}
                  result={WorkerAnalysisResultStore.get(workerInstance.id as PersonaId)}
                />
                {workerInstance.id === "executive" && (
                  <WorkerAiAnalysisBlock
                    personaId="executive-assistant"
                    personaLabel="Executive Assistant"
                    workerId="executive"
                    documents={getAllDocuments()}
                    result={WorkerAnalysisResultStore.get("executive-assistant")}
                  />
                )}
              </div>
            ) : (
              <ExecutionRestrictedNotice />
            )}
          </PageSection>
        </section>
      )}
    </>
  );
}

interface TimelineEntryLike {
  time: string;
  title: string;
  subtitle?: string;
  description: string;
  accent?: TimelineAccent;
}

// Shared by the Sales and Finance branches — both read the same Company
// Timeline feed (lib/enterprise/CompanyTimeline.ts) rather than
// maintaining separate ones. Reuses the shared TimelineCard primitive;
// caps to 5 visible entries with the rest behind Expandable, the same
// pattern already established on the Executive Dashboard.
function CompanyTimelineSection({ entries }: { entries: TimelineEntryLike[] }) {
  return (
    <PageSection
      title="Company Timeline"
      description="A running record of calls, meetings, quotations, and decisions across the team."
    >
      {entries.length === 0 ? (
        <EmptyState title="No activity recorded yet." />
      ) : (
        <div className={`${radius.card} ${surface.card} p-6`}>
          {entries.slice(0, 5).map((entry, index, visible) => (
            <TimelineCard
              key={index}
              title={entry.title}
              subtitle={entry.subtitle}
              time={entry.time}
              description={entry.description}
              accent={entry.accent}
              isLast={index === visible.length - 1 && entries.length <= 5}
            />
          ))}
          {entries.length > 5 && (
            <Expandable summary={`View all ${entries.length} activity items`}>
              {entries.slice(5).map((entry, index, rest) => (
                <TimelineCard
                  key={index}
                  title={entry.title}
                  subtitle={entry.subtitle}
                  time={entry.time}
                  description={entry.description}
                  accent={entry.accent}
                  isLast={index === rest.length - 1}
                />
              ))}
            </Expandable>
          )}
        </div>
      )}
    </PageSection>
  );
}

// Composes the shared PriorityCard primitive with this page's own
// deal-lookup logic (unchanged from before this sprint) — Customer,
// Priority Level, Reason, AI Recommendation, and Suggested Next Action are
// all shown per docs/design-system, then Start Work / Continue Work / "in
// progress with" exactly as before.
function SalesPriorityCard({
  row,
  canExecute,
  currentUserId,
  company,
}: {
  row: PriorityCustomerRow;
  canExecute: boolean;
  currentUserId: string;
  company: GeneratedCompany;
}) {
  const existingDeal = row.dealId ? SalesDealStore.get(row.dealId) : undefined;
  const ownerName = existingDeal
    ? company.enterpriseUsers.find((user) => user.id === existingDeal.ownerUserId)?.name
    : undefined;

  return (
    <PriorityCard
      title={row.customer.name}
      priorityLabel={row.priority}
      priorityTone={PRIORITY_TONE[row.priority]}
      reason={row.followUpReason}
      recommendation={row.aiRecommendation}
      details={
        <>
          <StatusBadge label={`Opportunity: ${row.estimatedOpportunity.toLocaleString()}`} tone="neutral" />
          <StatusBadge label={`Last interaction: ${row.lastInteraction}`} tone="neutral" />
          <StatusBadge label={`Next: ${row.suggestedAction}`} tone="neutral" />
        </>
      }
      actions={
        canExecute ? (
          <>
            {!existingDeal ? (
              <form action={startWork}>
                <input type="hidden" name="customerId" value={row.customer.id} />
                <ActionButton type="submit" variant="secondary">
                  Start Work
                </ActionButton>
              </form>
            ) : existingDeal.ownerUserId === currentUserId ? (
              <Link href={`#deal-${existingDeal.id}`} className={SECONDARY_LINK_CLASS}>
                Continue Work →
              </Link>
            ) : (
              <StatusBadge label={`In progress with ${ownerName ?? "someone"}`} tone="neutral" />
            )}
            <FollowUpExecutionDialog
              customerId={row.customer.id}
              customerName={row.customer.name}
              message={buildFollowUpMessage(row)}
              channel="Email"
              reason={row.followUpReason}
              initialRecord={SalesFollowUpExecutionStore.getLatestForCustomer(row.customer.id)}
              action={executeSalesFollowUp}
            />
          </>
        ) : undefined
      }
    />
  );
}

function DealPanel({
  company,
  deal,
  currentUserId,
}: {
  company: GeneratedCompany;
  deal: SalesDeal;
  currentUserId: string;
}) {
  const customer = company.customers.find((c) => c.id === deal.customerId);
  const owner = company.enterpriseUsers.find((u) => u.id === deal.ownerUserId);
  return (
    <div id={`deal-${deal.id}`}>
      <WorkflowStepPanel
        deal={deal}
        customerName={customer?.name ?? "Unknown customer"}
        ownerName={owner?.name ?? "Unknown"}
        // Real ownership only — no demo-mode bypass, in Demo Mode or Live
        // Company. A rep still sees their own deal once it's with the
        // Manager or Finance (showContinuePrompt below points them to the
        // right review venue) but can never act on it from here — that's
        // not their stage anymore.
        canAct={deal.ownerUserId === currentUserId && STAGE_CONFIG[deal.stage].responsibleRole === "Sales Rep"}
        showContinuePrompt
      />
    </div>
  );
}

function WorkerAiAnalysisBlock({
  personaId,
  personaLabel,
  workerId,
  documents,
  result,
}: {
  personaId: PersonaId;
  personaLabel: string;
  workerId: string;
  documents: DigitalDocument[];
  result: WorkerAnalysisResult | undefined;
}) {
  const grouping = WORKER_ANALYSIS_GROUPING[personaId];

  return (
    <div className={`${radius.card} ${surface.card} p-6`}>
      <p className={`${type.h3} ${text.primary}`}>{personaLabel}</p>

      <form action={analyzeDocumentAsWorker} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="personaId" value={personaId} />
        <input type="hidden" name="workerId" value={workerId} />
        <div className="min-w-[220px] flex-1">
          <label className={`${type.caption} ${text.muted}`}>Document</label>
          <select
            name="documentId"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-800 p-2 text-sm text-white outline-none"
          >
            <option value="" disabled>
              Select a document
            </option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.name}
              </option>
            ))}
          </select>
        </div>
        <ActionButton type="submit" variant="primary">
          Analyze
        </ActionButton>
      </form>

      {result ? (
        <div className="mt-6 space-y-5">
          {grouping ? (
            <>
              {grouping.leadSectionKey &&
                (() => {
                  const lead = result.sections.find((section) => section.key === grouping.leadSectionKey);
                  return lead ? <AnalysisSection section={lead} /> : null;
                })()}
              {grouping.groups.map((group) => {
                const groupSections = result.sections.filter((section) => group.sectionKeys.includes(section.key));
                if (groupSections.length === 0) return null;
                return (
                  <div key={group.title} className="rounded-lg border border-slate-800 p-4">
                    <p className={`${type.h3} ${text.primary}`}>{group.title}</p>
                    <div className="mt-3 space-y-3">
                      {groupSections.map((section) => (
                        <AnalysisSection key={section.key} section={section} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            result.sections.map((section) => <AnalysisSection key={section.key} section={section} />)
          )}
          <div className="border-t border-slate-800 pt-4">
            <p className={`${type.eyebrow} ${text.muted}`}>Knowledge Used</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.knowledgeSourcesUsed.map((used) => (
                <TagBadge
                  key={used.id}
                  label={`${used.name} (${used.source === "customer-upload" ? "Customer" : "Demo"})`}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <TagBadge label={`Model: ${result.modelUsed}`} />
              <TagBadge label={result.source} />
            </div>
          </div>
        </div>
      ) : (
        <p className={`mt-6 ${type.body} ${text.muted}`}>No analysis run yet — select a document and click Analyze.</p>
      )}
    </div>
  );
}

function AnalysisSection({ section }: { section: { key: string; label: string; value: string | string[] } }) {
  return (
    <div>
      <p className={`${type.eyebrow} ${text.muted}`}>{section.label}</p>
      {Array.isArray(section.value) ? (
        <ul className="mt-1 space-y-1 text-sm text-slate-300">
          {section.value.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className={`mt-1 ${type.body} ${text.secondary}`}>{section.value}</p>
      )}
    </div>
  );
}
