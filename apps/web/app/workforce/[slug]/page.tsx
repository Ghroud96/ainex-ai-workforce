import { notFound } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import DocumentCard from "@/components/DocumentCard";
import KnowledgeCard from "@/components/KnowledgeCard";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import ToolCard from "@/components/ToolCard";
import WorkerCapability from "@/components/WorkerCapability";
import WorkerHeader from "@/components/WorkerHeader";
import WorkflowCard from "@/components/WorkflowCard";
import { documents } from "@/data/documents";
import { workers } from "@/data/workers";
import type { PlanStep } from "@/lib/planning/PlanTypes";
import { WorkerRuntime } from "@/lib/runtime/WorkerRuntime";
import { getRetrievalReadyDocumentIds } from "@/lib/services/knowledge/knowledgeHubBridge";
import { WorkforceService } from "@/services/workforce/WorkforceService";

export function generateStaticParams() {
  return workers.map((worker) => ({ slug: worker.slug }));
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
  const availableDocuments = documents.filter((document) => document.usedBy.includes(worker.name));
  const connectedDepartments = Array.from(
    new Set([worker.department, ...availableDocuments.map((document) => document.department)]),
  );
  const retrievalReadyIds = await getRetrievalReadyDocumentIds();
  const retrievalReadyCount = availableDocuments.filter((document) =>
    retrievalReadyIds.has(document.id),
  ).length;

  // Runs the full B1-B8 pipeline (Runtime -> Worker Router -> ... ->
  // Execution Engine) for a sample request, so this section shows real
  // computed output rather than static placeholder text. Architecture
  // only — no real AI provider, workflow, or approval process is
  // connected, and nothing here is triggered by an actual user action.
  const intelligence = await WorkerRuntime.handle({
    workerId: workerInstance.id,
    userMessage: `Review current priorities for ${worker.department}`,
  });

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
