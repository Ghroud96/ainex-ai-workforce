export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: string;
  planStepId: string;
  requestedAt: string;
  reason: string;
  status: ApprovalStatus;
  decidedAt?: string;
  decidedBy?: string;
}

// Human-in-the-loop, architecture only. Nothing here notifies a real
// person or blocks on real input — approve()/reject() simulate the
// decision a human would make through a future UI or API.
class ApprovalStore {
  private requests = new Map<string, ApprovalRequest>();

  request(planStepId: string, reason: string): ApprovalRequest {
    const id = `approval-${planStepId}`;
    const existing = this.requests.get(id);
    if (existing) return existing;

    const approval: ApprovalRequest = {
      id,
      planStepId,
      requestedAt: new Date().toISOString(),
      reason,
      status: "pending",
    };
    this.requests.set(id, approval);
    return approval;
  }

  get(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  getByPlanStep(planStepId: string): ApprovalRequest | undefined {
    return this.requests.get(`approval-${planStepId}`);
  }

  decide(id: string, approved: boolean, decidedBy = "system"): ApprovalRequest | undefined {
    const approval = this.requests.get(id);
    if (!approval) return undefined;

    const updated: ApprovalRequest = {
      ...approval,
      status: approved ? "approved" : "rejected",
      decidedAt: new Date().toISOString(),
      decidedBy,
    };
    this.requests.set(id, updated);
    return updated;
  }
}

export const approvalStore = new ApprovalStore();
