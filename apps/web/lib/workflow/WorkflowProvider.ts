import type { Workflow, WorkflowRun } from "@/lib/workflow/WorkflowTypes";

export interface WorkflowTriggerContext {
  triggeredBy: string;
  approved?: boolean;
  input?: Record<string, unknown>;
}

// The seam AINEX's UI and worker logic never cross directly — they call
// WorkflowService, which calls whichever WorkflowProvider is active. This
// is what keeps n8n (or any future automation engine) out of the UI and
// worker logic entirely, per this phase's explicit requirement. Today the
// only implementation is N8nWorkflowProvider
// (lib/workflow/n8n/N8nWorkflowProvider.ts), which runs in a safe
// simulated mode whenever real n8n credentials aren't configured — see
// docs/architecture/n8n-integration.md.
export interface WorkflowProvider {
  id: string;
  name: string;
  isImplemented: boolean;
  trigger(workflow: Workflow, context: WorkflowTriggerContext): Promise<WorkflowRun>;
  getRun(runId: string): Promise<WorkflowRun | undefined>;
  cancel(runId: string): Promise<void>;
}
