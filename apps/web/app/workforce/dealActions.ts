"use server";

import { revalidatePath } from "next/cache";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import { runDealTouchpoint } from "@/lib/sales/DealAiService";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG, type DealStage, type DealTouchpointId } from "@/lib/sales/SalesDealTypes";

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

  revalidatePath("/workforce/sales");
  revalidatePath("/workforce/finance");
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
  revalidatePath("/workforce/sales");
}

type ManagerOutcome = "approve" | "reject" | "revise";
const MANAGER_OUTCOME_STAGE: Record<ManagerOutcome, DealStage> = {
  approve: "pending-finance-review",
  reject: "rejected",
  revise: "revision-requested",
};

export async function managerDecision(formData: FormData): Promise<void> {
  const dealId = formData.get("dealId");
  const outcome = formData.get("outcome") as ManagerOutcome | null;
  if (typeof dealId !== "string" || !outcome || !(outcome in MANAGER_OUTCOME_STAGE)) {
    throw new Error("A deal and decision are required.");
  }

  const deal = SalesDealStore.get(dealId);
  if (!deal) throw new Error("Deal could not be found.");

  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);
  const authorized = isSalesManager(currentUser) || CompanyModeStore.isDemoModeEnabled();
  if (!authorized) {
    throw new Error("You do not have permission to execute this Digital Worker.");
  }
  if (deal.stage !== "pending-manager-approval") {
    throw new Error("This deal is not awaiting manager approval.");
  }

  SalesDealStore.advance(dealId, MANAGER_OUTCOME_STAGE[outcome], `Manager ${outcome}d by ${currentUser.name}.`);
  revalidatePath("/workforce/sales");
  revalidatePath("/dashboard");
}

type FinanceOutcome = "approve" | "reject";
const FINANCE_OUTCOME_STAGE: Record<FinanceOutcome, DealStage> = {
  approve: "confirmed",
  reject: "rejected",
};

export async function financeDecision(formData: FormData): Promise<void> {
  const dealId = formData.get("dealId");
  const outcome = formData.get("outcome") as FinanceOutcome | null;
  if (typeof dealId !== "string" || !outcome || !(outcome in FINANCE_OUTCOME_STAGE)) {
    throw new Error("A deal and decision are required.");
  }

  const deal = SalesDealStore.get(dealId);
  if (!deal) throw new Error("Deal could not be found.");

  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);
  const authorized = isFinanceUser(currentUser) || CompanyModeStore.isDemoModeEnabled();
  if (!authorized) {
    throw new Error("You do not have permission to execute this Digital Worker.");
  }
  if (deal.stage !== "pending-finance-review") {
    throw new Error("This deal is not awaiting finance review.");
  }

  SalesDealStore.advance(dealId, FINANCE_OUTCOME_STAGE[outcome], `Finance ${outcome}d by ${currentUser.name}.`);
  revalidatePath("/workforce/finance");
  revalidatePath("/dashboard");
}
