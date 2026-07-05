import type { N8nWebhookResponse } from "@/lib/workflow/n8n/N8nWebhookClient";
import type { Workflow, WorkflowRun, WorkflowStatus, WorkflowStepResult } from "@/lib/workflow/WorkflowTypes";

let runCounter = 0;
function nextRunId(): string {
  runCounter += 1;
  return `run-${Date.now()}-${runCounter}`;
}

function mapN8nStatus(status: string): WorkflowStatus {
  switch (status.toLowerCase()) {
    case "success":
    case "finished":
      return "Completed";
    case "error":
    case "failed":
      return "Failed";
    case "waiting":
      return "Requires Approval";
    case "running":
      return "Running";
    default:
      return "Failed";
  }
}

// Maps a real n8n webhook response into AINEX's WorkflowRun shape — pure,
// no I/O, testable against a sample payload without a live n8n instance.
export function mapN8nResponseToRun(
  workflow: Workflow,
  triggeredBy: string,
  response: N8nWebhookResponse,
): WorkflowRun {
  const status = mapN8nStatus(response.status);
  const completedAt = status === "Completed" || status === "Failed" ? new Date().toISOString() : undefined;

  return {
    id: response.executionId || nextRunId(),
    workflowId: workflow.id,
    status,
    triggeredBy,
    providerId: "n8n",
    stepResults: workflow.steps.map((step) => ({ stepId: step.id, status })),
    startedAt: new Date().toISOString(),
    completedAt,
  };
}

// The safe-mock-mode path: builds a deterministic, clearly-labeled
// simulated run with no network call at all. This is what
// N8nWorkflowProvider uses whenever N8N_BASE_URL isn't configured (true
// by default in this environment) — see docs/architecture/n8n-integration.md.
export function buildSimulatedRun(workflow: Workflow, triggeredBy: string): WorkflowRun {
  const startedAt = new Date().toISOString();
  const completedAt = new Date().toISOString();

  const stepResults: WorkflowStepResult[] = workflow.steps.map((step) => ({
    stepId: step.id,
    status: "Completed",
    output: `[Simulated] "${step.name}" completed${step.actionType ? ` (${step.actionType})` : ""}.`,
  }));

  return {
    id: nextRunId(),
    workflowId: workflow.id,
    status: "Completed",
    triggeredBy,
    providerId: "n8n",
    stepResults,
    startedAt,
    completedAt,
  };
}
