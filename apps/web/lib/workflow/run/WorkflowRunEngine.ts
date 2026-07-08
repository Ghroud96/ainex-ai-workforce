import { decideStepIntelligence } from "@/lib/workflow/ai/AiDecisionGate";
import { buildAiUsageRecord } from "@/lib/workflow/ai/AiUsageTracker";
import { buildWorkflowAuditEntry } from "@/lib/workflow/run/WorkflowRunAuditLog";
import { buildWorkflowRunMetrics } from "@/lib/workflow/run/WorkflowRunMetrics";
import type {
  Workflow,
  WorkflowAiUsageRecord,
  WorkflowRun,
  WorkflowRunAuditEntry,
  WorkflowRunAuditEventType,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepIntelligenceDecisionLabel,
  WorkflowStepResult,
} from "@/lib/workflow/WorkflowTypes";

let runCounter = 0;

function nextRunId(): string {
  runCounter += 1;
  return `run-${Date.now()}-${runCounter}`;
}

function eventForDecision(label: WorkflowStepIntelligenceDecisionLabel): WorkflowRunAuditEventType {
  switch (label) {
    case "Intelligence Used":
      return "INTELLIGENCE_USED";
    case "Human Approval Required":
      return "HUMAN_APPROVAL_REQUIRED";
    case "Rule-Based Step":
      return "RULE_BASED_STEP";
    case "Intelligence Skipped":
    default:
      return "INTELLIGENCE_SKIPPED";
  }
}

function outputForStep(step: WorkflowStep, status: WorkflowStatus, usedIntelligence: boolean): string {
  const mode = usedIntelligence ? "Intelligence Used" : "Rule-Based Step";
  if (status === "Requires Approval") {
    return `[Simulated] "${step.name}" is waiting for Human Approval Required.`;
  }
  return `[Simulated] "${step.name}" completed as ${mode}${step.actionType ? ` (${step.actionType})` : ""}.`;
}

export interface WorkflowRunEngineRequest {
  workflow: Workflow;
  triggeredBy: string;
  approved?: boolean;
  providerId?: string;
  input?: Record<string, unknown>;
}

export const WorkflowRunEngine = {
  run(request: WorkflowRunEngineRequest): WorkflowRun {
    const runId = nextRunId();
    const startedAt = new Date().toISOString();
    const auditLog: WorkflowRunAuditEntry[] = [
      buildWorkflowAuditEntry({
        runId,
        eventType: "RUN_STARTED",
        message: `Workflow run started for "${request.workflow.name}".`,
        actor: "digital-worker",
        metadata: { workflowId: request.workflow.id },
      }),
    ];
    const aiUsage: WorkflowAiUsageRecord[] = [];
    const stepResults: WorkflowStepResult[] = [];

    for (const step of request.workflow.steps) {
      auditLog.push(
        buildWorkflowAuditEntry({
          runId,
          stepId: step.id,
          eventType: "STEP_STARTED",
          message: `Started workflow step "${step.name}".`,
          metadata: { order: step.order },
        }),
      );

      const decision = decideStepIntelligence({
        step,
        workflowRequiresApproval: request.workflow.requiresApproval,
        approved: request.approved,
      });
      aiUsage.push(buildAiUsageRecord(runId, decision));
      auditLog.push(
        buildWorkflowAuditEntry({
          runId,
          stepId: step.id,
          eventType: eventForDecision(decision.label),
          message: `${decision.label}: ${decision.reason}`,
          metadata: {
            estimatedCostUsd: decision.estimatedCostUsd,
            estimatedSavedUsd: decision.estimatedSavedUsd,
          },
        }),
      );

      const waitingForApproval = step.actionType === "Request Approval" && request.workflow.requiresApproval && !request.approved;
      const status: WorkflowStatus = waitingForApproval ? "Requires Approval" : "Completed";
      stepResults.push({
        stepId: step.id,
        status,
        output: outputForStep(step, status, decision.usedIntelligence),
        intelligence: decision,
      });
      auditLog.push(
        buildWorkflowAuditEntry({
          runId,
          stepId: step.id,
          eventType: status === "Requires Approval" ? "HUMAN_APPROVAL_REQUIRED" : "STEP_COMPLETED",
          message: status === "Requires Approval" ? `"${step.name}" is waiting for human approval.` : `Completed "${step.name}".`,
        }),
      );

      if (status === "Requires Approval") {
        const costMetrics = buildWorkflowRunMetrics(stepResults, aiUsage);
        auditLog.push(
          buildWorkflowAuditEntry({
            runId,
            eventType: "RUN_COMPLETED",
            message: "Workflow run paused for human approval.",
            metadata: { intelligenceAvoidanceRate: costMetrics.intelligenceAvoidanceRate },
          }),
        );

        return {
          id: runId,
          workflowId: request.workflow.id,
          status: "Requires Approval",
          triggeredBy: request.triggeredBy,
          providerId: request.providerId ?? "workflow-run-engine",
          stepResults,
          startedAt,
          aiUsage,
          costMetrics,
          auditLog,
        };
      }
    }

    const completedAt = new Date().toISOString();
    const costMetrics = buildWorkflowRunMetrics(stepResults, aiUsage);
    auditLog.push(
      buildWorkflowAuditEntry({
        runId,
        eventType: "RUN_COMPLETED",
        message: "Workflow run completed.",
        metadata: { intelligenceAvoidanceRate: costMetrics.intelligenceAvoidanceRate },
      }),
    );

    return {
      id: runId,
      workflowId: request.workflow.id,
      status: "Completed",
      triggeredBy: request.triggeredBy,
      providerId: request.providerId ?? "workflow-run-engine",
      stepResults,
      startedAt,
      completedAt,
      aiUsage,
      costMetrics,
      auditLog,
    };
  },
};
