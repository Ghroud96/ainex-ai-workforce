"use server";

import { revalidatePath } from "next/cache";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";

// The only place Company Mode can be switched — mirrors setLiveAiMode
// exactly. Demo Company Mode is on by default; this action is how anyone
// opts into Live Company Mode's full permission enforcement instead.
export async function setDemoCompanyMode(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "true";

  CompanyModeStore.setDemoModeEnabled(enabled);
  revalidatePath("/", "layout");
}
