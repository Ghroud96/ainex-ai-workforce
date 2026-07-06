import { buildEmptyCompany } from "@/lib/enterprise/EmptyCompanyBuilder";
import { generateCompany } from "@/lib/enterprise/CompanyGenerator";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import type { CompanySize, GeneratedCompany, Industry } from "@/lib/enterprise/EnterpriseTypes";

// The one abstraction the whole Demo/Live capability sits behind —
// everything above this file (Dashboard, Workforce, Knowledge, Workflow,
// Sales) keeps consuming a plain GeneratedCompany and never branches on
// which provider produced it. A fixed 2-member union, not an open plugin
// registry like CompanyIntelligenceRegistry: there are exactly two
// implementations today and no product reason to expect a third.
export interface CompanyDataProvider {
  id: "demo" | "live";
  getCompany(industry: Industry, size: CompanySize): GeneratedCompany;
}

// Behaves exactly as today: a deterministic, fully-populated company
// reseeded from whichever industry/size is currently selected.
export const DemoCompanyProvider: CompanyDataProvider = {
  id: "demo",
  getCompany: (industry, size) => generateCompany(industry, size),
};

// Never generates demo data, regardless of the requested industry/size —
// a brand-new Live Company starts completely empty.
export const LiveCompanyProvider: CompanyDataProvider = {
  id: "live",
  getCompany: (industry, size) => buildEmptyCompany(industry, size),
};

// The one place anything reads "which provider is active right now" —
// CompanyModeStore's existing boolean (already the single source of truth
// for permission-bypass) doubles as the provider switch: one flag, two
// meanings, not two flags.
export function getActiveCompanyDataProvider(): CompanyDataProvider {
  return CompanyModeStore.isDemoModeEnabled() ? DemoCompanyProvider : LiveCompanyProvider;
}
