import type {
  SalesFollowUpExecutionRecord,
  SalesFollowUpExecutionStatus,
  SalesFollowUpExecutionPayload,
} from "@/lib/sales/execution/SalesFollowUpTypes";

const IN_FLIGHT_STATUSES: SalesFollowUpExecutionStatus[] = ["pending", "processing"];
const TERMINAL_STATUSES: SalesFollowUpExecutionStatus[] = ["succeeded", "failed"];

function historyNoteFor(status: SalesFollowUpExecutionStatus, detail?: string): string {
  switch (status) {
    case "pending":
      return "Execution requested.";
    case "processing":
      return "Sent to the follow-up service.";
    case "succeeded":
      return detail ?? "Follow-up delivered.";
    case "failed":
      return detail ?? "Follow-up failed.";
  }
}

// AINEX's own record of every sales.follow_up execution — the system of
// record the brief requires ("AINEX owns... execution status, audit
// trail"), not something n8n tracks. globalThis-anchored the same way
// lib/sales/SalesDealStore.ts and lib/decisions/DecisionStore.ts are: this
// store is read from a Server Component (the Sales Workspace page) and
// written from both a Server Action and the callback route, which can be
// separate module graphs under Turbopack dev.
class SalesFollowUpExecutionStoreImpl {
  private recordsById = new Map<string, SalesFollowUpExecutionRecord>();
  private latestIdByCustomerId = new Map<string, string>();

  create(payload: SalesFollowUpExecutionPayload): SalesFollowUpExecutionRecord {
    const record: SalesFollowUpExecutionRecord = {
      ...payload,
      status: "pending",
      history: [{ status: "pending", at: payload.requestedAt, note: historyNoteFor("pending") }],
    };
    this.recordsById.set(record.executionId, record);
    this.latestIdByCustomerId.set(record.customer.id, record.executionId);
    return record;
  }

  get(executionId: string): SalesFollowUpExecutionRecord | undefined {
    return this.recordsById.get(executionId);
  }

  getLatestForCustomer(customerId: string): SalesFollowUpExecutionRecord | undefined {
    const executionId = this.latestIdByCustomerId.get(customerId);
    return executionId ? this.recordsById.get(executionId) : undefined;
  }

  getInFlightForCustomer(customerId: string): SalesFollowUpExecutionRecord | undefined {
    const record = this.getLatestForCustomer(customerId);
    return record && IN_FLIGHT_STATUSES.includes(record.status) ? record : undefined;
  }

  // Idempotent by design: a record that already reached succeeded/failed is
  // never overwritten, which is what makes both a duplicate n8n callback
  // delivery and a duplicate user click harmless.
  updateStatus(
    executionId: string,
    status: SalesFollowUpExecutionStatus,
    detail?: { externalReference?: string; errorMessage?: string },
  ): SalesFollowUpExecutionRecord | undefined {
    const record = this.recordsById.get(executionId);
    if (!record) return undefined;
    if (TERMINAL_STATUSES.includes(record.status)) return record;

    const at = new Date().toISOString();
    const updated: SalesFollowUpExecutionRecord = {
      ...record,
      status,
      externalReference: detail?.externalReference ?? record.externalReference,
      errorMessage: detail?.errorMessage ?? record.errorMessage,
      completedAt: TERMINAL_STATUSES.includes(status) ? at : record.completedAt,
      history: [
        ...record.history,
        { status, at, note: historyNoteFor(status, detail?.errorMessage ?? detail?.externalReference) },
      ],
    };
    this.recordsById.set(executionId, updated);
    return updated;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.SalesFollowUpExecutionStore");
type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: SalesFollowUpExecutionStoreImpl };
const globalWithStore = globalThis as GlobalWithStore;

export const SalesFollowUpExecutionStore: SalesFollowUpExecutionStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new SalesFollowUpExecutionStoreImpl());
