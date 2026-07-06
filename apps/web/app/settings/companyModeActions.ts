"use server";

import { revalidatePath } from "next/cache";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";

// The only place the Experience selector can be switched. Flipping this
// flag doesn't just relabel the UI — it changes which Company Data
// Provider is active, so the whole company must be regenerated from that
// provider immediately (refreshActiveProvider), the same full propagation
// setSelection() already does for an industry/size change (WorkerRegistry
// rebuild, knowledge cache reset, analysis-result clear, current-user
// clear) — otherwise every other page would keep showing the previous
// provider's data until something else happened to touch CompanyProfileStore.
export async function setDemoCompanyMode(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "true";

  CompanyModeStore.setDemoModeEnabled(enabled);
  await CompanyProfileStore.refreshActiveProvider();
  revalidatePath("/", "layout");
}
