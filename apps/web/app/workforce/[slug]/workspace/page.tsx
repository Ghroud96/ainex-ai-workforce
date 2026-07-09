import { notFound } from "next/navigation";
import Expandable from "@/components/Expandable";
import ExecutionRestrictedNotice from "@/components/ExecutionRestrictedNotice";
import KpiCard from "@/components/KpiCard";
import PriorityBadge from "@/components/PriorityBadge";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import TodaysDecision from "@/components/TodaysDecision";
import WorkflowStepPanel from "@/components/WorkflowStepPanel";
import { analyzeDocumentAsWorker } from "@/app/workforce/aiActions";
import { getAllDocuments, type DigitalDocument } from "@/data/documents";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import { EnterpriseDemoStore } from "@/lib/enterprise/EnterpriseDemoStore";
import { canAccessWorker, type DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { buildCollaborationChain, buildTodaysActivity } from "@/lib/enterprise/NarrativeBuilder";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG, type SalesDeal } from "@/lib/sales/SalesDealTypes";
import { rankPriorityCustomers, type PriorityCustomerRow } from "@/lib/sales/SalesPriorityBuilder";
import { WORKER_ANALYSIS_GROUPING } from "@/lib/services/knowledge/WorkerAnalysisGrouping";
import { WorkerAnalysisResultStore } from "@/lib/services/knowledge/WorkerAnalysisResultStore";
import type { PersonaId, WorkerAnalysisResult } from "@/lib/services/knowledge/WorkerAnalysisService";
import { WorkforceService } from "@/services/workforce/WorkforceService";

// "sales" deliberately excluded — its Worker AI Analysis section is
// replaced entirely by the Sales Workspace (Business Monitor + connected
// deal workflow) below, per Enterprise Demo V1.
const AI_ANALYSIS_PERSONA_IDS: readonly string[] = ["executive", "finance", "inventory", "hr"];

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

  // Enterprise Demo V1 — the connected Sales -> Manager -> Finance story.
  // In Demo Company Mode, the current simulated user can act at every
  // stage of that story without switching users — see CompanyModeStore.ts.
  const isSalesManager =
    (currentUser.departmentWorkerId === "sales" && currentUser.roleLevel !== "Staff") ||
    CompanyModeStore.isDemoModeEnabled();
  const priorityCustomers = workerInstance.id === "sales" ? rankPriorityCustomers(company, currentUser) : [];
  const allDeals = workerInstance.id === "sales" || workerInstance.id === "finance" ? SalesDealStore.listFor(company) : [];
  // Demo-mode bypassed the same way every other gate on this page already
  // is (isSalesManager above, canAct below) — without this, a presenter
  // driving the Enterprise Demo's featured opportunity through its
  // Sales-Rep-owned stages would need to switch to that deal's actual
  // owner first, the one remaining reason a user switch was ever required.
  const myDeals = workerInstance.id === "sales"
    ? allDeals.filter((deal) => deal.ownerUserId === currentUser.id || CompanyModeStore.isDemoModeEnabled())
    : [];
  // The Enterprise Demo Experience's one featured opportunity — leads "My
  // Deals" on its own, everything else collapses behind Expandable. See
  // lib/enterprise/EnterpriseDemoEngine.ts.
  const featuredDealId = EnterpriseDemoStore.getFeaturedDealId();
  const featuredDeal = featuredDealId ? myDeals.find((deal) => deal.id === featuredDealId) : undefined;
  const otherDeals = featuredDeal ? myDeals.filter((deal) => deal.id !== featuredDealId) : myDeals;
  const dealsAwaitingManager = workerInstance.id === "sales" && isSalesManager
    ? allDeals.filter((deal) => deal.stage === "pending-manager-approval")
    : [];
  const dealsAwaitingFinance = workerInstance.id === "finance" ? allDeals.filter((deal) => deal.stage === "pending-finance-review") : [];

  // Sales Workspace home-screen summary — "what do I need to work on
  // today," computed from data already derived above. Zero AI, orthogonal
  // to Company Mode (read-only counts, not gated actions).
  const todayIso = new Date().toISOString().slice(0, 10);
  const urgentCustomerCount = priorityCustomers.filter(
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

  return (
    <>
      <section>
        <SectionTitle
          title="Today's Work"
          description={`What the ${worker.name} has already done this morning.`}
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <div className="space-y-3">
            {todaysActivity.map((item, index) => (
              <div key={index} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-xs text-slate-500">{item.time}</span>
                <p className="text-sm text-slate-200">{item.text}</p>
              </div>
            ))}
          </div>
          {collaborationStep && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="text-xs font-medium tracking-wide text-blue-400 uppercase">Cross-Department Collaboration</p>
              <p className="mt-2 text-sm text-slate-300">{collaborationStep.message}</p>
            </div>
          )}
        </div>
      </section>

      {workerInstance.id === "sales" && (
        <>
          <section>
            <SectionTitle
              title="Today's Priorities"
              description="What needs your attention right now — computed from your own accounts and deals, no AI involved."
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
              <KpiCard title="Priority Customers" value={urgentCustomerCount.toString()} />
              <KpiCard title="Customers Requiring Follow-up" value={customersNeedingFollowUp.toString()} />
              <KpiCard title="Meetings Today" value={meetingsToday.toString()} />
              <KpiCard title="Pending Quotations" value={pendingQuotations.toString()} />
              <KpiCard title="Pending Sales Orders" value={pendingSalesOrders.toString()} />
            </div>
          </section>

          <section>
            <SectionTitle
              title="Business Monitor"
              description="Who should I follow up today? Ranked automatically from real account data — no AI involved."
            />
            {priorityCustomers.length === 0 ? (
              <div className="text-sm text-slate-500">
                <p>No customers yet.</p>
                <p>Import customers or connect CRM.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {priorityCustomers.slice(0, 3).map((row) => (
                    <PriorityRow key={row.customer.id} row={row} />
                  ))}
                </div>
                {priorityCustomers.length > 3 && (
                  <div className="mt-3">
                    <Expandable summary={`View all ${priorityCustomers.length} priorities`}>
                      <div className="space-y-3">
                        {priorityCustomers.slice(3).map((row) => (
                          <PriorityRow key={row.customer.id} row={row} />
                        ))}
                      </div>
                    </Expandable>
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <SectionTitle
              title="My Deals"
              description="Every step may optionally use AI. Review each result before continuing — AI assists, you decide."
            />
            {!hasExecuteAccess ? (
              <ExecutionRestrictedNotice />
            ) : (
              <div className="space-y-4">
                <TodaysDecision company={company} variant="compact" minScreenIndex={1} />
                {myDeals.length === 0 ? (
                  <p className="text-sm text-slate-500">No active deals right now.</p>
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
          </section>

          {isSalesManager && (
            <section>
              <SectionTitle
                title="Manager Approval"
                description="Sales orders from your team awaiting your decision."
              />
              {dealsAwaitingManager.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing is awaiting your approval right now.</p>
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
            </section>
          )}
        </>
      )}

      {workerInstance.id === "finance" && (
        <section>
          <SectionTitle
            title="Finance Review"
            description="Approved sales orders awaiting finance sign-off before the order is confirmed."
          />
          {!hasExecuteAccess ? (
            <ExecutionRestrictedNotice />
          ) : (
            <div className="space-y-4">
              <TodaysDecision company={company} variant="compact" minScreenIndex={2} />
              {dealsAwaitingFinance.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing is awaiting finance review right now.</p>
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
                      canAct
                    />
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {AI_ANALYSIS_PERSONA_IDS.includes(workerInstance.id) && (
        <section>
          <SectionTitle
            title="Run AI"
            description={`Business actions ${worker.name} can take on this opportunity right now.`}
          />
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
        </section>
      )}
    </>
  );
}

function PriorityRow({ row }: { row: PriorityCustomerRow }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{row.customer.name}</p>
          <p className="mt-1 text-xs text-slate-500">{row.followUpReason}</p>
        </div>
        <PriorityBadge priority={row.priority} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <TagBadge label={`Opportunity: ${row.estimatedOpportunity.toLocaleString()}`} />
        <TagBadge label={`Last interaction: ${row.lastInteraction}`} />
        <TagBadge label={row.suggestedAction} />
      </div>
    </div>
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
    <WorkflowStepPanel
      deal={deal}
      customerName={customer?.name ?? "Unknown customer"}
      ownerName={owner?.name ?? "Unknown"}
      // A rep still sees their own deal once it's with the Manager or
      // Finance (tracking progress), but can't act on it — that's not
      // their stage anymore. In Demo Company Mode this restriction is
      // bypassed so the whole story can be walked without switching users.
      canAct={
        (deal.ownerUserId === currentUserId && STAGE_CONFIG[deal.stage].responsibleRole === "Sales Rep") ||
        CompanyModeStore.isDemoModeEnabled()
      }
    />
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
    <div className="rounded-xl bg-slate-900 p-6">
      <p className="text-sm font-semibold text-white">{personaLabel}</p>

      <form action={analyzeDocumentAsWorker} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="personaId" value={personaId} />
        <input type="hidden" name="workerId" value={workerId} />
        <div className="min-w-[220px] flex-1">
          <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">Document</label>
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
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          Analyze
        </button>
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
                    <p className="text-sm font-semibold text-white">{group.title}</p>
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
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Knowledge Used</p>
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
        <p className="mt-6 text-sm text-slate-500">No analysis run yet — select a document and click Analyze.</p>
      )}
    </div>
  );
}

function AnalysisSection({ section }: { section: { key: string; label: string; value: string | string[] } }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{section.label}</p>
      {Array.isArray(section.value) ? (
        <ul className="mt-1 space-y-1 text-sm text-slate-300">
          {section.value.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-slate-300">{section.value}</p>
      )}
    </div>
  );
}
