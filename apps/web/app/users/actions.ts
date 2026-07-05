"use server";

import { revalidatePath } from "next/cache";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { CurrentUserStore } from "@/lib/enterprise/CurrentUserStore";

// Switches which generated Enterprise User is "logged in" for this
// simulated session — the only identity boundary in a no-auth demo.
// Revalidates the whole app since the current user affects the Sidebar,
// every worker page's execute-permission gate, and AI analysis
// personalization, mirroring updateCompanyProfile's full-app revalidation.
export async function switchCurrentUser(formData: FormData): Promise<void> {
  const userId = formData.get("userId");

  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("A user is required.");
  }

  const { company } = CompanyProfileStore.getCurrent();
  if (!company.enterpriseUsers.some((user) => user.id === userId)) {
    throw new Error("Selected user could not be found.");
  }

  CurrentUserStore.setCurrentUserId(userId);
  revalidatePath("/", "layout");
}
