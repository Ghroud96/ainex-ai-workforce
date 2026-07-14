// A deliberately narrow status set for this one execution bridge — not the
// 7-value ExecutionStatus from lib/execution/ExecutionTypes.ts (that's the
// unrelated plan-step Execution Engine), so a status check here can never
// be silently compared against the wrong enum.
export type SalesFollowUpExecutionStatus = "pending" | "processing" | "succeeded" | "failed";

export type SalesFollowUpChannel = "email";

export interface SalesFollowUpCustomer {
  id: string;
  name: string;
  email: string;
  // Customer records in this codebase (lib/enterprise/EnterpriseTypes.ts)
  // carry no phone number today, and channel is scoped to "email" only for
  // V1 (WhatsApp is an explicit non-goal) — always undefined for now,
  // reserved for a future channel.
  phone?: string;
}

// The exact outbound payload shape from the Capability 09 brief.
export interface SalesFollowUpExecutionPayload {
  executionId: string;
  companyId: string;
  type: "sales.follow_up";
  customer: SalesFollowUpCustomer;
  message: string;
  channel: SalesFollowUpChannel;
  requestedBy: string;
  requestedAt: string;
}

export interface SalesFollowUpHistoryEntry {
  status: SalesFollowUpExecutionStatus;
  at: string;
  note: string;
}

// AINEX's own record of the request — this, not n8n, is the system of
// record for status. history is this record's own audit trail, the same
// convention SalesDeal.history already uses instead of a separate parallel
// audit-log store.
export interface SalesFollowUpExecutionRecord extends SalesFollowUpExecutionPayload {
  status: SalesFollowUpExecutionStatus;
  completedAt?: string;
  externalReference?: string;
  errorMessage?: string;
  history: SalesFollowUpHistoryEntry[];
}
