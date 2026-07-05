import { callN8nWebhook } from "@/lib/workflow/n8n/N8nWebhookClient";
import { isN8nConfigured } from "@/lib/workflow/n8n/N8nCredentialConfig";
import { buildSimulatedRun, mapN8nResponseToRun } from "@/lib/workflow/n8n/N8nRunMapper";
import { workflowRunStore } from "@/lib/workflow/WorkflowRunStore";
import type { Workflow, WorkflowRun } from "@/lib/workflow/WorkflowTypes";
import type { WorkflowProvider, WorkflowTriggerContext } from "@/lib/workflow/WorkflowProvider";

// The one WorkflowProvider implementation. Whenever N8N_BASE_URL isn't
// configured — the default in this environment, per this phase's
// explicit "do not require real n8n credentials yet" instruction —
// trigger() runs in a safe simulated mode: no HTTP call is made, and a
// deterministic WorkflowRun is returned instead, clearly labeled
// "[Simulated]" in its step output. This is the "safe mock mode" the
// task asked for, not a separate mock provider class — see
// docs/architecture/n8n-integration.md for why one real, honestly-gated
// implementation was chosen over a real/mock pair.
export const N8nWorkflowProvider: WorkflowProvider = {
  id: "n8n",
  name: "n8n",
  isImplemented: true,

  async trigger(workflow: Workflow, context: WorkflowTriggerContext): Promise<WorkflowRun> {
    if (!isN8nConfigured()) {
      const run = buildSimulatedRun(workflow, context.triggeredBy);
      return workflowRunStore.save(run);
    }

    try {
      const response = await callN8nWebhook(workflow.id, {
        triggeredBy: context.triggeredBy,
        input: context.input ?? {},
      });
      const run = mapN8nResponseToRun(workflow, context.triggeredBy, response);
      return workflowRunStore.save(run);
    } catch (error) {
      const message = error instanceof Error ? error.message : "n8n is currently unavailable.";
      const run: WorkflowRun = {
        id: `run-${Date.now()}`,
        workflowId: workflow.id,
        status: "Failed",
        triggeredBy: context.triggeredBy,
        providerId: "n8n",
        stepResults: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        error: message,
      };
      return workflowRunStore.save(run);
    }
  },

  async getRun(runId: string): Promise<WorkflowRun | undefined> {
    return workflowRunStore.getById(runId);
  },

  async cancel(runId: string): Promise<void> {
    const run = workflowRunStore.getById(runId);
    if (!run || run.status === "Completed" || run.status === "Failed") return;
    workflowRunStore.save({ ...run, status: "Cancelled", completedAt: new Date().toISOString() });
  },
};
