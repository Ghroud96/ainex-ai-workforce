import type { N8nWebhookResponse } from "@/lib/workflow/n8n/N8nWebhookClient";
import type { Workflow, WorkflowRun, WorkflowStatus } from "@/lib/workflow/WorkflowTypes";
import { WorkflowRunEngine } from "@/lib/workflow/run/WorkflowRunEngine";

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
  const tracedRun = WorkflowRunEngine.run({ workflow, triggeredBy, approved: true, providerId: "n8n" });

  return {
    ...tracedRun,
    id: response.executionId || tracedRun.id,
    workflowId: workflow.id,
    status,
    triggeredBy,
    providerId: "n8n",
    stepResults: tracedRun.stepResults.map((result) => ({ ...result, status })),
    completedAt,
  };
}

// The safe-mock-mode path: builds a deterministic, clearly-labeled
// simulated run with no network call at all. This is what
// N8nWorkflowProvider uses whenever N8N_BASE_URL isn't configured (true
// by default in this environment) — see docs/architecture/n8n-integration.md.
export function buildSimulatedRun(workflow: Workflow, triggeredBy: string): WorkflowRun {
  return WorkflowRunEngine.run({ workflow, triggeredBy, approved: true, providerId: "n8n" });
}
