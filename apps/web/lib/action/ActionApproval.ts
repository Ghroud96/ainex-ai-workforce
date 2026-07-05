export type ActionApprovalStatus = "pending" | "approved" | "rejected";

export interface ActionApprovalRequest {
  id: string;
  actionRequestId: string;
  requestedAt: string;
  reason: string;
  status: ActionApprovalStatus;
  decidedAt?: string;
  decidedBy?: string;
}

// Deliberately a separate store from lib/execution/ExecutionApproval.ts's
// approvalStore, not a shared one keyed by convention across two
// domains — plan-step approval and action approval are different id
// namespaces with different call sites, and this store is small enough
// that sharing would trade a few lines of duplication for an implicit,
// harder-to-follow coupling between two otherwise-independent layers.
// See docs/architecture/action-execution.md.
class ActionApprovalStore {
  private requests = new Map<string, ActionApprovalRequest>();

  request(actionRequestId: string, reason: string): ActionApprovalRequest {
    const id = `action-approval-${actionRequestId}`;
    const existing = this.requests.get(id);
    if (existing) return existing;

    const approval: ActionApprovalRequest = {
      id,
      actionRequestId,
      requestedAt: new Date().toISOString(),
      reason,
      status: "pending",
    };
    this.requests.set(id, approval);
    return approval;
  }

  get(id: string): ActionApprovalRequest | undefined {
    return this.requests.get(id);
  }

  getByActionRequest(actionRequestId: string): ActionApprovalRequest | undefined {
    return this.requests.get(`action-approval-${actionRequestId}`);
  }

  decide(id: string, approved: boolean, decidedBy = "system"): ActionApprovalRequest | undefined {
    const approval = this.requests.get(id);
    if (!approval) return undefined;

    const updated: ActionApprovalRequest = {
      ...approval,
      status: approved ? "approved" : "rejected",
      decidedAt: new Date().toISOString(),
      decidedBy,
    };
    this.requests.set(id, updated);
    return updated;
  }
}

export const actionApprovalStore = new ActionApprovalStore();
