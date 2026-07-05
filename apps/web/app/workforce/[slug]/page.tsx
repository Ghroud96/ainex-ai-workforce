import { notFound } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import DocumentCard from "@/components/DocumentCard";
import KnowledgeCard from "@/components/KnowledgeCard";
import PriorityBadge from "@/components/PriorityBadge";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import ToolCard from "@/components/ToolCard";
import WorkerCapability from "@/components/WorkerCapability";
import WorkerHeader from "@/components/WorkerHeader";
import WorkflowCard from "@/components/WorkflowCard";
import WorkflowStepPanel from "@/components/WorkflowStepPanel";
import { analyzeDocumentAsWorker } from "@/app/workforce/aiActions";
import { getAllDocuments, type DigitalDocument } from "@/data/documents";
import { getAllWorkers } from "@/data/workers";
import { enrichWorkflowRun } from "@/lib/enterprise/BusinessInsights";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import { canAccessWorker, type DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { buildCollaborationChain, buildTodaysActivity } from "@/lib/enterprise/NarrativeBuilder";
import type { PlanStep } from "@/lib/planning/PlanTypes";
import { WorkerRuntime } from "@/lib/runtime/WorkerRuntime";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG } from "@/lib/sales/SalesDealTypes";
import { rankPriorityCustomers } from "@/lib/sales/SalesPriorityBuilder";
import { getRetrievalReadyDocumentIds } from "@/lib/services/knowledge/knowledgeHubBridge";
import { WorkerAnalysisResultStore } from "@/lib/services/knowledge/WorkerAnalysisResultStore";
import type { PersonaId, WorkerAnalysisResult } from "@/lib/services/knowledge/WorkerAnalysisService";
import { WorkflowService } from "@/lib/workflow/WorkflowService";
import type { WorkflowRun } from "@/lib/workflow/WorkflowTypes";
import { WorkforceService } from "@/services/workforce/WorkforceService";

// "sales" deliberately excluded — its Worker AI Analysis section is
// replaced entirely by the Sales Workspace (Business Monitor + connected
// deal workflow) below, per Enterprise Demo V1.
const AI_ANALYSIS_PERSONA_IDS: readonly string[] = ["executive", "finance", "inventory", "hr"];

export function generateStaticParams() {
  return getAllWorkers().map((worker) => ({ slug: worker.slug }));
}

export default async function WorkerDetailPage({
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
  const health = WorkforceService.getHealth(workerInstance);
  const availableActions = workerInstance.definition.availableActions;
  const availableDocuments = getAllDocuments().filter((document) => document.usedBy.includes(worker.name));
  const connectedDepartments = Array.from(
    new Set([worker.department, ...availableDocuments.map((document) => document.department)]),
  );
  const retrievalReadyIds = await getRetrievalReadyDocumentIds();
  const retrievalReadyCount = availableDocuments.filter((document) =>
    retrievalReadyIds.has(document.id),
  ).length;

  const recommendedWorkflows = WorkflowService.recommendedForWorker(workerInstance.id);
  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);
  // View access is universal (every employee can discover every Digital
  // Worker's overview/Purpose/Today's Work/etc. below, unchanged) — this
  // only gates whether the Worker AI Analysis section further down can
  // actually be executed by the current simulated user.
  const hasExecuteAccess = canAccessWorker(currentUser, workerInstance.id as DepartmentWorkerId);

  // Enterprise Demo V1 — the connected Sales -> Manager -> Finance story.
  const isSalesManager = currentUser.departmentWorkerId === "sales" && currentUser.roleLevel !== "Staff";
  const priorityCustomers = workerInstance.id === "sales" ? rankPriorityCustomers(company, currentUser) : [];
  const allDeals = workerInstance.id === "sales" || workerInstance.id === "finance" ? SalesDealStore.listFor(company) : [];
  const myDeals = workerInstance.id === "sales" ? allDeals.filter((deal) => deal.ownerUserId === currentUser.id) : [];
  const dealsAwaitingManager = workerInstance.id === "sales" && isSalesManager
    ? allDeals.filter((deal) => deal.stage === "pending-manager-approval")
    : [];
  const dealsAwaitingFinance = workerInstance.id === "finance" ? allDeals.filter((deal) => deal.stage === "pending-finance-review") : [];

  const todaysActivity = buildTodaysActivity(workerInstance.id, company);
  const collaborationStep = buildCollaborationChain(company).find((step) => step.workerId === workerInstance.id);

  // Runs the full B1-C9 pipeline (Runtime -> Worker Router -> ... ->
  // Execution Engine -> Action Layer -> Workflow Layer -> n8n Provider)
  // for a sample request, so this section shows real computed output
  // rather than static placeholder text. Architecture only — no real AI
  // provider, workflow, or approval process is connected, and nothing
  // here is triggered by an actual user action.
  const intelligence = await WorkerRuntime.handle({
    workerId: workerInstance.id,
    userMessage: `Review current priorities for ${worker.department}`,
  });

  // Read after WorkerRuntime.handle() so a workflow run it just triggered
  // (Action Layer -> Workflow Layer, see docs/architecture/workflow-automation.md)
  // is reflected below, not missed by reading the run store one step too early.
  const recentWorkflowRuns = WorkflowService.runHistoryForWorker(workerInstance.id).slice(0, 5);
  const workflowApprovalsRequired = WorkflowService.approvalsRequiredForWorker(workerInstance.id);

  const stepsByPlanStepId = new Map(
    intelligence?.execution.steps.map((step) => [step.planStepId, step] as const) ?? [],
  );
  const pendingSteps =
    intelligence?.planning.plan.steps.filter((step) => {
      const status = stepsByPlanStepId.get(step.id)?.status;
      return status === "Pending" || status === "Running";
    }) ?? [];
  const approvalSteps =
    intelligence?.planning.plan.steps.filter(
      (step) => stepsByPlanStepId.get(step.id)?.status === "Waiting Approval",
    ) ?? [];
  const completedSteps =
    intelligence?.planning.plan.steps.filter(
      (step) => stepsByPlanStepId.get(step.id)?.status === "Completed",
    ) ?? [];
  const failedSteps =
    intelligence?.planning.plan.steps.filter(
      (step) => stepsByPlanStepId.get(step.id)?.status === "Failed",
    ) ?? [];

  return (
    <div className="max-w-5xl space-y-10">
      <WorkerHeader worker={worker} />

      <section>
        <SectionTitle title="Purpose" />
        <p className="text-slate-300">{worker.purpose}</p>
      </section>

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

      <section>
        <SectionTitle
          title="Manager Summary"
          description="The Reasoning Engine's own read of this worker's current priorities — computed on every page load, not previously surfaced here."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-sm font-semibold text-white">
            {intelligence?.reasoning.executiveSummary.headline ?? "No summary available yet."}
          </p>
          <p className="mt-2 text-sm text-slate-300">{intelligence?.reasoning.executiveSummary.narrative}</p>
          {intelligence && (
            <div className="mt-4 flex flex-wrap gap-2">
              <TagBadge label={`Current Focus: ${intelligence.reasoning.overallPriority.level} priority`} />
              <TagBadge label={`Confidence: ${intelligence.reasoning.confidence.label}`} />
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Recent Decisions"
          description="Risks, opportunities, and anomalies this worker's Reasoning stage identified from today's knowledge review."
        />
        {!intelligence || intelligence.reasoning.findings.length === 0 ? (
          <p className="text-sm text-slate-500">No decisions recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {intelligence.reasoning.findings.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">{finding.title}</p>
                  <TagBadge label={finding.category} />
                </div>
                <p className="mt-1 text-sm text-slate-400">{finding.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Business Recommendations"
          description="Concrete actions this worker's Decision stage recommended in response to today's findings."
        />
        {!intelligence || intelligence.reasoning.actions.length === 0 ? (
          <p className="text-sm text-slate-500">No recommendations right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {intelligence.reasoning.actions.map((action) => (
              <WorkflowCard key={action.id} name={action.title} description={action.description} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Upcoming Work"
          description="Follow-up suggestions from the Reasoning Engine for what comes next."
        />
        {!intelligence || intelligence.reasoning.followUps.length === 0 ? (
          <p className="text-sm text-slate-500">No follow-up action required right now.</p>
        ) : (
          <ul className="space-y-2">
            {intelligence.reasoning.followUps.map((followUp, index) => (
              <li key={index} className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
                {followUp}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle
          title="Knowledge Sources"
          description="Company knowledge this worker draws on when answering questions or making decisions."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {worker.knowledgeSources.map((source) => (
            <KnowledgeCard key={source} name={source} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Available Knowledge"
          description="Documents from the Knowledge Hub this worker can currently draw on, and their retrieval readiness."
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {connectedDepartments.map((department) => (
              <TagBadge key={department} label={department} />
            ))}
          </div>
          <span className="text-sm text-slate-400">
            {retrievalReadyCount} of {availableDocuments.length} documents retrieval-ready
          </span>
        </div>

        {availableDocuments.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No Knowledge Hub document is linked yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            {availableDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Connected Workflows"
          description="Workflow Automation this worker can trigger from a decision."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {worker.workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.name}
              name={workflow.name}
              description={workflow.description}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Connected Tools"
          description="Enterprise Integrations this worker can act through."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {worker.tools.map((tool) => (
            <ToolCard key={tool} name={tool} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Current Capabilities" />
        <WorkerCapability worker={worker} />
      </section>

      <section>
        <SectionTitle
          title="Available Actions"
          description="Concrete actions this worker's Decision stage can take, generated by the Digital Workforce Engine."
        />
        {availableActions.length === 0 ? (
          <p className="text-sm text-slate-500">No actions registered for this worker yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {availableActions.map((action) => (
              <WorkflowCard key={action.id} name={action.name} description={action.description} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Worker Health"
          description="Live status reported by the Digital Workforce Engine's WorkerStatus service."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Operational</p>
            <p className="mt-2 text-lg font-semibold text-white">{health.operational ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 sm:col-span-2">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Notes</p>
            <p className="mt-2 text-sm text-slate-300">{health.notes}</p>
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Worker Memory"
          description="Architecture only — no database is connected, so nothing is written or recalled yet."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5">
          {["Short Term", "Conversation", "Company", "Knowledge", "Long Term"].map((memoryType) => (
            <div key={memoryType} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-500">
              <p className="font-medium text-slate-400">{memoryType} Memory</p>
              <p className="mt-1 text-xs">Not yet populated</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Current Plan"
          description="Architecture-ready — generated by the Planning Engine for a sample request. No worker, workflow, or approval is actually triggered."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Goal</p>
          <p className="mt-1 text-sm text-slate-200">
            {intelligence?.planning.plan.goal ?? "Planning pipeline unavailable."}
          </p>

          {!intelligence || intelligence.planning.plan.steps.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No plan steps were generated for this request — the underlying question had no risks,
              opportunities, or anomalies to act on.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {intelligence.planning.plan.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{step.title}</p>
                    <p className="text-xs text-slate-500">
                      {step.workerId ?? "—"} · {step.capabilityId ?? "—"} · {step.priority.level} priority
                    </p>
                  </div>
                  {step.requiresApproval && <TagBadge label="Requires Approval" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Execution Results"
          description="Mock execution of the plan above — architecture-ready, not live automation. No real worker, workflow, or human approval is connected yet."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ExecutionStepGroup title="Pending Actions" steps={pendingSteps} />
          <ExecutionStepGroup title="Approval Required" steps={approvalSteps} />
          <ExecutionStepGroup title="Completed Steps" steps={completedSteps} />
          <ExecutionStepGroup title="Failed Steps" steps={failedSteps} />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Execution Timeline"
          description="Chronological record of this mock execution run."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          {!intelligence || intelligence.execution.timeline.length === 0 ? (
            <p className="text-sm text-slate-500">No recorded activity yet.</p>
          ) : (
            <div className="space-y-2 text-sm text-slate-300">
              {intelligence.execution.timeline.map((entry, index) => (
                <p key={index}>
                  <span className="text-slate-500">{entry.timestamp}</span> — {entry.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Recommended Workflows"
          description="Workflow Automation this worker's Planning Engine can recommend triggering — routed through the Workflow Layer, never n8n directly."
        />
        {recommendedWorkflows.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow is registered for this worker yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recommendedWorkflows.map((workflow) => (
              <WorkflowCard key={workflow.id} name={workflow.name} description={workflow.description} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Approval Required"
          description="Workflow runs for this worker waiting on human approval before they execute."
        />
        {workflowApprovalsRequired.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow runs are waiting on approval.</p>
        ) : (
          <div className="space-y-2">
            {workflowApprovalsRequired.map((run) => (
              <WorkflowRunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Recent Workflow Runs"
          description="This worker's most recent workflow runs, most recent first — mock data today, architecture-ready for a real n8n instance."
        />
        {recentWorkflowRuns.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow runs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {recentWorkflowRuns.map((run) => (
              <WorkflowRunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Worker Chat"
          description={`Ask the ${worker.name} anything within its scope.`}
        />
        <ChatPanel
          aiLabel={worker.name}
          placeholder={`Ask the ${worker.name}...`}
          initialMessages={[
            {
              role: "ai",
              content: `Hi, I'm the ${worker.name}. ${worker.purpose}`,
            },
          ]}
        />
      </section>

      {workerInstance.id === "sales" && (
        <>
          <section>
            <SectionTitle
              title="Business Monitor"
              description="Who should I follow up today? Ranked automatically from real account data — no AI involved."
            />
            {priorityCustomers.length === 0 ? (
              <p className="text-sm text-slate-500">No customers assigned to you yet.</p>
            ) : (
              <div className="space-y-3">
                {priorityCustomers.map((row) => (
                  <div key={row.customer.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
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
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle
              title="My Deals"
              description="Every step may optionally use AI. Review each result before continuing — AI assists, you decide."
            />
            {!hasExecuteAccess ? (
              <ExecutionRestrictedNotice />
            ) : myDeals.length === 0 ? (
              <p className="text-sm text-slate-500">No active deals right now.</p>
            ) : (
              <div className="space-y-4">
                {myDeals.map((deal) => {
                  const customer = company.customers.find((c) => c.id === deal.customerId);
                  const owner = company.enterpriseUsers.find((u) => u.id === deal.ownerUserId);
                  return (
                    <WorkflowStepPanel
                      key={deal.id}
                      deal={deal}
                      customerName={customer?.name ?? "Unknown customer"}
                      ownerName={owner?.name ?? "Unknown"}
                      // A rep still sees their own deal once it's with the
                      // Manager or Finance (tracking progress), but can't
                      // act on it — that's not their stage anymore.
                      canAct={deal.ownerUserId === currentUser.id && STAGE_CONFIG[deal.stage].responsibleRole === "Sales Rep"}
                    />
                  );
                })}
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
          ) : dealsAwaitingFinance.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing is awaiting finance review right now.</p>
          ) : (
            <div className="space-y-4">
              {dealsAwaitingFinance.map((deal) => {
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

      {AI_ANALYSIS_PERSONA_IDS.includes(workerInstance.id) && (
        <section>
          <SectionTitle
            title="Worker AI Analysis"
            description={`Ask the ${worker.name} to analyze a document from its own business perspective — deterministic today, upgrading automatically once Live AI is enabled.`}
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
        <div className="mt-6 space-y-4">
          {result.sections.map((section) => (
            <div key={section.key}>
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
          ))}
          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4">
            <TagBadge label={`Company Intelligence Used: ${result.knowledgeSourcesUsed.join(", ")}`} />
            <TagBadge label={`Model: ${result.modelUsed}`} />
            <TagBadge label={result.source} />
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">No analysis run yet — select a document and click Analyze.</p>
      )}
    </div>
  );
}

function ExecutionRestrictedNotice() {
  return (
    <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6">
      <p className="text-sm font-semibold text-amber-400">Access Restricted</p>
      <p className="mt-2 text-sm text-slate-400">
        You do not have permission to execute this Digital Worker.
        <br />
        Please contact your administrator if access is required.
      </p>
    </div>
  );
}

function ExecutionStepGroup({ title, steps }: { title: string; steps: PlanStep[] }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        {title} ({steps.length})
      </p>
      {steps.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">None</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {steps.map((step) => (
            <li key={step.id}>{step.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkflowRunRow({ run }: { run: WorkflowRun }) {
  const workflow = WorkflowService.getById(run.workflowId);
  const enriched = enrichWorkflowRun(run, workflow);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{workflow?.name ?? run.workflowId}</p>
        <p className="mt-1 text-xs text-slate-500">
          Triggered by {run.triggeredBy} via {run.providerId} · {run.startedAt}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Waiting for: {enriched.waitingFor} · Est. completion: {enriched.estimatedCompletion}
        </p>
        {run.error && <p className="mt-1 text-xs text-red-400">{run.error}</p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        <TagBadge label={run.status} />
        <PriorityBadge priority={enriched.priority} />
      </div>
    </div>
  );
}
