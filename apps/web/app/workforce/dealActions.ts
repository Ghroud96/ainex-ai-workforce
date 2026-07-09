"use server";

import { revalidatePath } from "next/cache";
import { authorizedOrDemoMode } from "@/lib/approvals/ApprovalAuthorization";
import { createStageDecisionAction } from "@/lib/approvals/StageDecisionAction";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import { runDealTouchpoint } from "@/lib/sales/DealAiService";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG, type DealStage, type DealTouchpointId, type SalesDeal } from "@/lib/sales/SalesDealTypes";

function isSalesManager(user: EnterpriseUser): boolean {
  return user.departmentWorkerId === "sales" && user.roleLevel !== "Staff";
}

function isFinanceUser(user: EnterpriseUser): boolean {
  return user.departmentWorkerId === "finance";
}

// Only the deal's own Sales rep may act on it at the sales-rep-owned
// stages — the Sales Workspace UI already filters each rep's list to
// their own deals; this is the server-side backstop, same pattern as
// aiActions.ts's canAccessWorker check.
function isDealOwner(user: EnterpriseUser, ownerUserId: string): boolean {
  return user.id === ownerUserId;
}

// Runs one of the 8 AI touchpoints for a deal — always exactly one AI
// call on explicit click, same safety rule as every other "Run AI"
// action in this app. At the two approval-gate stages (manager-review,
// finance-review) this only records an informational result; it never
// advances the stage on its own — Approve/Reject/Request Revision do.
export async function runDealAi(formData: FormData): Promise<void> {
  const dealId = formData.get("dealId");
  const touchpointId = formData.get("touchpointId") as DealTouchpointId | null;

  if (typeof dealId !== "string" || typeof touchpointId !== "string") {
    throw new Error("A deal and touchpoint are required.");
  }

  const deal = SalesDealStore.get(dealId);
  if (!deal) throw new Error("Deal could not be found.");

  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);
  const customer = company.customers.find((c) => c.id === deal.customerId);
  if (!customer) throw new Error("Customer could not be found.");

  const stageConfig = STAGE_CONFIG[deal.stage];
  if (stageConfig.touchpointId !== touchpointId) {
    throw new Error("This action is not available at the deal's current stage.");
  }

  const authorized =
    (stageConfig.responsibleRole === "Sales Manager"
      ? isSalesManager(currentUser)
      : stageConfig.responsibleRole === "Finance"
        ? isFinanceUser(currentUser)
        : isDealOwner(currentUser, deal.ownerUserId)) || CompanyModeStore.isDemoModeEnabled();
  if (!authorized) {
    throw new Error("You do not have permission to execute this Digital Worker.");
  }

  // Deliberately does NOT advance the stage — running AI only records a
  // reviewable result. Advancing is always a separate, explicit "Next
  // Step" click (advanceDeal), so the result is guaranteed to render
  // before the deal can move on.
  const result = await runDealTouchpoint(touchpointId, deal, customer, company, currentUser);
  SalesDealStore.recordAiResult(dealId, touchpointId, result);

  revalidatePath("/workforce/sales/workspace");
  revalidatePath("/workforce/finance/workspace");
  revalidatePath("/dashboard");
}

// The one generic "move to the next step" action, available whether or
// not Run AI was used first (AI assists, it never gates progress) —
// covers "mark meeting completed," "submit for approval," "revise &
// resubmit," and every other forward transition in STAGE_CONFIG.
export async function advanceDeal(formData: FormData): Promise<void> {
  const dealId = formData.get("dealId");
  if (typeof dealId !== "string") throw new Error("A deal is required.");

  const deal = SalesDealStore.get(dealId);
  if (!deal) throw new Error("Deal could not be found.");

  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);
  const authorized = isDealOwner(currentUser, deal.ownerUserId) || CompanyModeStore.isDemoModeEnabled();
  if (!authorized) {
    throw new Error("You do not have permission to execute this Digital Worker.");
  }

  const stageConfig = STAGE_CONFIG[deal.stage];
  if (!stageConfig.nextStage) throw new Error("This deal has no next step available at its current stage.");

  SalesDealStore.advance(dealId, stageConfig.nextStage, stageConfig.nextStepLabel ?? "Advanced.");
  revalidatePath("/workforce/sales/workspace");
}

type ManagerOutcome = "approve" | "reject" | "revise";
const MANAGER_OUTCOME_STAGE: Record<ManagerOutcome, DealStage> = {
  approve: "pending-finance-review",
  reject: "rejected",
  revise: "revision-requested",
};

// The reference consumer of the shared approval framework — see
// lib/approvals/StageDecisionAction.ts and
// docs/architecture/approval-workflow-engine.md. Every future workflow's
// decision action should look like this: entity/stage plumbing only, no
// re-implemented gating, auth-bypass, or error handling.
export const managerDecision = createStageDecisionAction<SalesDeal, DealStage, ManagerOutcome>({
  requiredStage: "pending-manager-approval",
  outcomeToStage: MANAGER_OUTCOME_STAGE,
  getEntity: (id) => SalesDealStore.get(id),
  getStage: (deal) => deal.stage,
  isAuthorized: (user) => authorizedOrDemoMode(isSalesManager(user)),
  advance: (id, nextStage, note) => SalesDealStore.advance(id, nextStage, note),
  buildNote: (outcome, user) => `Manager ${outcome}d by ${user.name}.`,
  revalidate: () => {
    revalidatePath("/workforce/sales/workspace");
    revalidatePath("/dashboard");
  },
  messages: {
    invalidRequest: "A deal and decision are required.",
    notFound: "Deal could not be found.",
  },
});

type FinanceOutcome = "approve" | "reject";
const FINANCE_OUTCOME_STAGE: Record<FinanceOutcome, DealStage> = {
  approve: "confirmed",
  reject: "rejected",
};

export const financeDecision = createStageDecisionAction<SalesDeal, DealStage, FinanceOutcome>({
  requiredStage: "pending-finance-review",
  outcomeToStage: FINANCE_OUTCOME_STAGE,
  getEntity: (id) => SalesDealStore.get(id),
  getStage: (deal) => deal.stage,
  isAuthorized: (user) => authorizedOrDemoMode(isFinanceUser(user)),
  advance: (id, nextStage, note) => SalesDealStore.advance(id, nextStage, note),
  buildNote: (outcome, user) => `Finance ${outcome}d by ${user.name}.`,
  revalidate: () => {
    revalidatePath("/workforce/finance/workspace");
    revalidatePath("/dashboard");
  },
  messages: {
    invalidRequest: "A deal and decision are required.",
    notFound: "Deal could not be found.",
  },
});
