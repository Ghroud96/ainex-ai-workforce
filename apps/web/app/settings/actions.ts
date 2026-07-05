"use server";

import { revalidatePath } from "next/cache";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { INDUSTRIES } from "@/lib/enterprise/IndustryTemplates";
import { COMPANY_SIZES } from "@/lib/enterprise/CompanySizeTiers";
import type { CompanySize, Industry } from "@/lib/enterprise/EnterpriseTypes";

function isIndustry(value: FormDataEntryValue | null): value is Industry {
  return typeof value === "string" && (INDUSTRIES as string[]).includes(value);
}

function isCompanySize(value: FormDataEntryValue | null): value is CompanySize {
  return typeof value === "string" && (COMPANY_SIZES as string[]).includes(value);
}

// The one place the whole platform's demo company changes. Every page
// reads CompanyProfileStore.getCurrent() (directly or through
// data/workers.ts / data/documents.ts), so revalidating every route
// after this call is what makes "changing company size automatically
// changes everything" actually true across the app, not just on this page.
export async function updateCompanyProfile(formData: FormData): Promise<void> {
  const industryValue = formData.get("industry");
  const sizeValue = formData.get("size");

  if (!isIndustry(industryValue) || !isCompanySize(sizeValue)) {
    throw new Error("Invalid industry or company size selection.");
  }

  await CompanyProfileStore.setSelection(industryValue, sizeValue);
  revalidatePath("/", "layout");
}
