import { isSalesFollowUpConfigured } from "@/lib/sales/execution/SalesFollowUpCredentials";
import { sendFollowUpExecution } from "@/lib/sales/execution/SalesFollowUpExecutionClient";
import { SalesFollowUpExecutionStore } from "@/lib/sales/execution/SalesFollowUpExecutionStore";
import type {
  SalesFollowUpExecutionRecord,
  SalesFollowUpExecutionStatus,
} from "@/lib/sales/execution/SalesFollowUpTypes";

export interface RequestFollowUpInput {
  companyId: string;
  customer: { id: string; name: string; email: string };
  message: string;
  requestedBy: string;
}

export interface HandleCallbackInput {
  executionId: string;
  status: Extract<SalesFollowUpExecutionStatus, "succeeded" | "failed">;
  externalReference?: string;
  errorMessage?: string;
}

// The one seam the Server Action and the n8n callback route are allowed to
// call — neither touches SalesFollowUpExecutionStore, the credentials, or
// the HTTP client directly. Mirrors ActionService's role for the Action
// Layer (lib/action/ActionService.ts).
export const SalesFollowUpExecutionService = {
  // Approval already happened (the human confirmed in the dialog before
  // this is ever called) — this is the request + dispatch step, not a
  // second approval gate.
  async requestFollowUp(input: RequestFollowUpInput): Promise<SalesFollowUpExecutionRecord> {
    const inFlight = SalesFollowUpExecutionStore.getInFlightForCustomer(input.customer.id);
    if (inFlight) return inFlight;

    const record = SalesFollowUpExecutionStore.create({
      executionId: `exec-${crypto.randomUUID()}`,
      companyId: input.companyId,
      type: "sales.follow_up",
      customer: { id: input.customer.id, name: input.customer.name, email: input.customer.email },
      message: input.message,
      channel: "email",
      requestedBy: input.requestedBy,
      requestedAt: new Date().toISOString(),
    });

    if (!isSalesFollowUpConfigured()) {
      // Safe simulated mode — the default in this environment, same
      // honesty convention as N8nWorkflowProvider's buildSimulatedRun().
      // No network call is made.
      return (
        SalesFollowUpExecutionStore.updateStatus(record.executionId, "succeeded", {
          externalReference: "[Simulated] Follow-up delivered — no real n8n webhook is configured.",
        }) ?? record
      );
    }

    SalesFollowUpExecutionStore.updateStatus(record.executionId, "processing");

    try {
      await sendFollowUpExecution(record);
      // Accepted — the callback route resolves this to succeeded/failed.
      return SalesFollowUpExecutionStore.get(record.executionId) ?? record;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The follow-up request failed.";
      return SalesFollowUpExecutionStore.updateStatus(record.executionId, "failed", { errorMessage: message }) ?? record;
    }
  },

  handleCallback(input: HandleCallbackInput): SalesFollowUpExecutionRecord | undefined {
    const existing = SalesFollowUpExecutionStore.get(input.executionId);
    if (!existing) return undefined;

    return SalesFollowUpExecutionStore.updateStatus(input.executionId, input.status, {
      externalReference: input.externalReference,
      errorMessage: input.errorMessage,
    });
  },
};
