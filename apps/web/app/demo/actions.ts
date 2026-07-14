"use server";

import { revalidatePath } from "next/cache";
import { resetTeachAinexSession } from "@/app/knowledge/teachAinexActions";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { EnterpriseDemoStore } from "@/lib/enterprise/EnterpriseDemoStore";
import { pickFeaturedOpportunity } from "@/lib/enterprise/EnterpriseDemoEngine";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { WorkerAnalysisResultStore } from "@/lib/services/knowledge/WorkerAnalysisResultStore";

// The single "known starting state" button behind the whole Enterprise
// Demo Experience (see docs/product/enterprise-demo-experience.md) — picks
// one featured opportunity, resets it to its just-seeded state, and clears
// every other piece of state a previous demo run may have left behind, so
// the same button always opens the same way no matter how many times it's
// been clicked today. Reuses resetTeachAinexSession() from the Hybrid Demo
// capability rather than duplicating its store clears — this is genuinely
// one button for the entire combined demo, not just the deal half.
export async function startEnterpriseDemo(): Promise<void> {
  const { company } = CompanyProfileStore.getCurrent();
  const deals = SalesDealStore.listFor(company);
  const featured = pickFeaturedOpportunity(company, deals);
  if (!featured) return;

  SalesDealStore.resetDeal(featured.id);
  EnterpriseDemoStore.start(featured.id);
  WorkerAnalysisResultStore.clear();
  await resetTeachAinexSession();

  revalidatePath("/", "layout");
}
