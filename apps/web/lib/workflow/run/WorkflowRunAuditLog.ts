import type {
  WorkflowRunAuditEntry,
  WorkflowRunAuditEventType,
} from "@/lib/workflow/WorkflowTypes";

let auditCounter = 0;

export function buildWorkflowAuditEntry(input: {
  runId: string;
  stepId?: string;
  eventType: WorkflowRunAuditEventType;
  message: string;
  actor?: WorkflowRunAuditEntry["actor"];
  metadata?: WorkflowRunAuditEntry["metadata"];
}): WorkflowRunAuditEntry {
  auditCounter += 1;

  return {
    id: `workflow-audit-${Date.now()}-${auditCounter}`,
    runId: input.runId,
    stepId: input.stepId,
    eventType: input.eventType,
    message: input.message,
    actor: input.actor ?? "system",
    timestamp: new Date().toISOString(),
    metadata: input.metadata,
  };
}
