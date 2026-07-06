import type { CompanySize, GeneratedCompany, Industry } from "@/lib/enterprise/EnterpriseTypes";

// A stable id (not industry/size-derived like Demo's ids) so SalesDealStore/
// DecisionStore's per-company-id seeding maps stay pinned to the same key
// across every Demo <-> Live toggle — a real company's identity shouldn't
// reset just because the Experience switch was flipped.
export const LIVE_COMPANY_ID = "live-company";

// The Live Provider's starting state: a real, structurally valid
// GeneratedCompany with every collection empty and every derived number
// zeroed, rather than a null/undefined "no company" case — every existing
// consumer already operates on a plain GeneratedCompany value.
export function buildEmptyCompany(industry: Industry, size: CompanySize): GeneratedCompany {
  const currentYear = new Date().getFullYear();
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

  return {
    profile: {
      id: LIVE_COMPANY_ID,
      name: "Your Company",
      industry,
      size,
      tagline: "Set up your company to get started.",
      description: "This is your Live Company — no data has been added yet.",
      foundedYear: currentYear,
      hqCity: "",
      hqRegion: "",
      currency: "RM",
      employeeCount: 0,
      annualRevenue: 0,
      fiscalYearLabel: `Q${currentQuarter} ${currentYear}`,
    },
    employees: [],
    products: [],
    customers: [],
    suppliers: [],
    warehouses: [],
    inventory: [],
    salesOrders: [],
    purchaseOrders: [],
    invoices: [],
    financials: {
      fiscalPeriod: `Q${currentQuarter} ${currentYear}`,
      revenue: 0,
      expenses: 0,
      netIncome: 0,
      cashOnHand: 0,
      outstandingReceivables: 0,
      revenueTrendPct: 0,
      expenseTrendPct: 0,
    },
    campaigns: [],
    supportTickets: [],
    events: [],
    enterpriseUsers: [],
  };
}
