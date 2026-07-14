"use server";

import { revalidatePath } from "next/cache";
import { authorizedOrDemoMode } from "@/lib/approvals/ApprovalAuthorization";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import { getTodaysPriorities } from "@/lib/sales/PriorityEngine";
import { buildFollowUpMessage } from "@/lib/sales/execution/SalesFollowUpMessage";
import { SalesFollowUpExecutionService } from "@/lib/sales/execution/SalesFollowUpExecutionService";
import type { SalesFollowUpExecutionRecord } from "@/lib/sales/execution/SalesFollowUpTypes";

export interface FollowUpExecutionState {
  error: string | null;
  record?: SalesFollowUpExecutionRecord;
}

function isSalesManager(user: EnterpriseUser): boolean {
  return user.departmentWorkerId === "sales" && user.roleLevel !== "Staff";
}

function ownsCustomer(user: EnterpriseUser, customerId: string): boolean {
  return user.departmentWorkerId === "sales" && user.assignedCustomerIds.includes(customerId);
}

// The human confirmation already happened in the dialog before this fires —
// this is the "AINEX creates an execution request" step. Because
// SalesFollowUpExecutionService.requestFollowUp() is idempotent per
// in-flight customer, resubmitting this same action (the dialog's "Check
// Status" button) both refreshes status and guarantees duplicate clicks
// never create a duplicate external send.
export async function executeSalesFollowUp(
  _prevState: FollowUpExecutionState,
  formData: FormData,
): Promise<FollowUpExecutionState> {
  const customerId = formData.get("customerId");
  if (typeof customerId !== "string" || customerId.length === 0) {
    return { error: "A customer is required." };
  }

  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);

  const authorized = authorizedOrDemoMode(isSalesManager(currentUser) || ownsCustomer(currentUser, customerId));
  if (!authorized) {
    return { error: "You do not have permission to execute this Digital Worker." };
  }

  const row = getTodaysPriorities(company, currentUser).find((entry) => entry.customer.id === customerId);
  if (!row) {
    return { error: "This customer is no longer in your priority list." };
  }

  const record = await SalesFollowUpExecutionService.requestFollowUp({
    companyId: company.profile.id,
    customer: { id: row.customer.id, name: row.customer.name, email: row.customer.contactEmail },
    message: buildFollowUpMessage(row),
    requestedBy: currentUser.id,
  });

  revalidatePath("/workforce/sales/workspace");
  return { error: null, record };
}
