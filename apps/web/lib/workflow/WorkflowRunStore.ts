import type { WorkflowRun } from "@/lib/workflow/WorkflowTypes";
import { workflows } from "@/data/workflows";
import { decideStepIntelligence } from "@/lib/workflow/ai/AiDecisionGate";
import { buildAiUsageRecord } from "@/lib/workflow/ai/AiUsageTracker";
import { buildWorkflowAuditEntry } from "@/lib/workflow/run/WorkflowRunAuditLog";
import { buildWorkflowRunMetrics } from "@/lib/workflow/run/WorkflowRunMetrics";

// Seed history so Run History / Failed Runs / Approval Required have
// real (mock) content to show on first load, the same reasoning
// data/documents.ts and data/workers.ts seed the Knowledge Hub and
// Digital Workforce pages — an empty state everywhere would understate
// what this layer can display once workflows actually run.
const SEED_RUNS: WorkflowRun[] = [
  {
    id: "run-seed-1",
    workflowId: "lead-follow-up",
    status: "Completed",
    triggeredBy: "sales",
    providerId: "n8n",
    stepResults: [
      { stepId: "lead-follow-up-1", status: "Completed", output: "[Mock] Stalled lead detected." },
      { stepId: "lead-follow-up-2", status: "Completed", output: "[Mock] Follow-up WhatsApp sent." },
      { stepId: "lead-follow-up-3", status: "Completed", output: "[Mock] CRM opportunity updated." },
    ],
    startedAt: "2026-06-28T08:12:00.000Z",
    completedAt: "2026-06-28T08:12:04.000Z",
  },
  {
    id: "run-seed-2",
    workflowId: "invoice-reminders",
    status: "Failed",
    triggeredBy: "finance",
    providerId: "n8n",
    stepResults: [
      { stepId: "invoice-reminders-1", status: "Completed", output: "[Mock] Overdue invoice identified." },
      { stepId: "invoice-reminders-2", status: "Failed", output: "[Mock] Email provider unavailable." },
    ],
    startedAt: "2026-06-29T10:05:00.000Z",
    completedAt: "2026-06-29T10:05:03.000Z",
    error: "[Mock] Email provider unavailable.",
  },
  {
    id: "run-seed-3",
    workflowId: "low-stock-reorder",
    status: "Requires Approval",
    triggeredBy: "inventory",
    providerId: "n8n",
    stepResults: [
      { stepId: "low-stock-reorder-1", status: "Completed", output: "[Mock] Threshold breach detected for Ganick Ginger." },
      { stepId: "low-stock-reorder-2", status: "Completed", output: "[Mock] Reorder task created." },
      { stepId: "low-stock-reorder-3", status: "Requires Approval", output: "[Mock] Awaiting manager approval for reorder above threshold." },
    ],
    startedAt: "2026-07-01T14:30:00.000Z",
  },
  {
    id: "run-seed-4",
    workflowId: "weekly-executive-digest",
    status: "Completed",
    triggeredBy: "system",
    providerId: "n8n",
    stepResults: [
      { stepId: "weekly-executive-digest-1", status: "Completed", output: "[Mock] Aggregated department signals." },
      { stepId: "weekly-executive-digest-2", status: "Completed", output: "[Mock] Digest emailed to leadership." },
    ],
    startedAt: "2026-06-29T07:00:00.000Z",
    completedAt: "2026-06-29T07:00:05.000Z",
  },
];

function enrichSeedRun(run: WorkflowRun): WorkflowRun {
  const workflow = workflows.find((item) => item.id === run.workflowId);
  if (!workflow) return run;

  const aiUsage = workflow.steps.map((step) =>
    buildAiUsageRecord(
      run.id,
      decideStepIntelligence({ step, workflowRequiresApproval: workflow.requiresApproval, approved: run.status !== "Requires Approval" }),
    ),
  );
  const stepResults = run.stepResults.map((result) => {
    const usage = aiUsage.find((record) => record.stepId === result.stepId);
    const step = workflow.steps.find((item) => item.id === result.stepId);
    const decision = step
      ? decideStepIntelligence({ step, workflowRequiresApproval: workflow.requiresApproval, approved: run.status !== "Requires Approval" })
      : undefined;
    return {
      ...result,
      intelligence: decision
        ? {
            label: decision.label,
            usedIntelligence: decision.usedIntelligence,
            reason: decision.reason,
            decisionSource: decision.decisionSource,
            estimatedCostUsd: decision.estimatedCostUsd,
            estimatedSavedUsd: decision.estimatedSavedUsd,
          }
        : undefined,
      output: result.output ?? (usage ? `[Simulated] ${usage.label}.` : result.output),
    };
  });
  const costMetrics = buildWorkflowRunMetrics(stepResults, aiUsage);
  const auditLog = [
    buildWorkflowAuditEntry({
      runId: run.id,
      eventType: "RUN_STARTED",
      message: `Workflow run started for "${workflow.name}".`,
      actor: "digital-worker",
      metadata: { workflowId: workflow.id },
    }),
    ...stepResults.flatMap((result) => {
      const step = workflow.steps.find((item) => item.id === result.stepId);
      const label = result.intelligence?.label ?? "Rule-Based Step";
      return [
        buildWorkflowAuditEntry({
          runId: run.id,
          stepId: result.stepId,
          eventType: "STEP_STARTED",
          message: `Started workflow step "${step?.name ?? result.stepId}".`,
        }),
        buildWorkflowAuditEntry({
          runId: run.id,
          stepId: result.stepId,
          eventType:
            label === "Intelligence Used"
              ? "INTELLIGENCE_USED"
              : label === "Human Approval Required"
                ? "HUMAN_APPROVAL_REQUIRED"
                : label === "Rule-Based Step"
                  ? "RULE_BASED_STEP"
                  : "INTELLIGENCE_SKIPPED",
          message: `${label}: ${result.intelligence?.reason ?? "Completed with deterministic workflow policy."}`,
        }),
        buildWorkflowAuditEntry({
          runId: run.id,
          stepId: result.stepId,
          eventType: result.status === "Failed" ? "STEP_FAILED" : "STEP_COMPLETED",
          message: result.status === "Failed" ? `"${step?.name ?? result.stepId}" failed.` : `Completed "${step?.name ?? result.stepId}".`,
        }),
      ];
    }),
    buildWorkflowAuditEntry({
      runId: run.id,
      eventType: run.status === "Failed" ? "RUN_FAILED" : "RUN_COMPLETED",
      message: run.status === "Requires Approval" ? "Workflow run paused for human approval." : `Workflow run ${run.status.toLowerCase()}.`,
      metadata: { intelligenceAvoidanceRate: costMetrics.intelligenceAvoidanceRate },
    }),
  ];

  return { ...run, stepResults, aiUsage, costMetrics, auditLog };
}

// In-memory, resets on server restart — same scope as ExecutionApproval's
// approvalStore and every other Sprint 4+ mock store in this codebase.
class WorkflowRunStoreImpl {
  private runs = new Map<string, WorkflowRun>(SEED_RUNS.map((run) => enrichSeedRun(run)).map((run) => [run.id, run]));

  save(run: WorkflowRun): WorkflowRun {
    this.runs.set(run.id, run);
    return run;
  }

  getById(id: string): WorkflowRun | undefined {
    return this.runs.get(id);
  }

  getAll(): WorkflowRun[] {
    return Array.from(this.runs.values()).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  getByWorkflow(workflowId: string): WorkflowRun[] {
    return this.getAll().filter((run) => run.workflowId === workflowId);
  }

  getByStatus(status: WorkflowRun["status"]): WorkflowRun[] {
    return this.getAll().filter((run) => run.status === status);
  }
}

export const workflowRunStore = new WorkflowRunStoreImpl();
