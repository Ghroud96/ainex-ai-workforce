import type { CompanySize } from "@/lib/enterprise/EnterpriseTypes";

export interface Range {
  min: number;
  max: number;
}

export interface SizeTier {
  employeeSample: Range;
  employeeCount: Range;
  products: Range;
  customers: Range;
  suppliers: Range;
  warehouses: Range;
  salesOrders: Range;
  purchaseOrders: Range;
  campaigns: Range;
  supportTickets: Range;
  businessEvents: Range;
  annualRevenue: Range;
  documentCount: Range;
}

// Named/rendered sample sizes stay pleasant to display (nobody wants a
// 150-row unpaginated table on a demo dashboard); employeeCount and
// annualRevenue scale independently as headline numbers only, the same
// pattern real ERP/CRM demo sandboxes use.
export const COMPANY_SIZE_TIERS: Record<CompanySize, SizeTier> = {
  SME: {
    employeeSample: { min: 12, max: 20 },
    employeeCount: { min: 15, max: 60 },
    products: { min: 6, max: 12 },
    customers: { min: 10, max: 18 },
    suppliers: { min: 4, max: 8 },
    warehouses: { min: 1, max: 1 },
    salesOrders: { min: 15, max: 25 },
    purchaseOrders: { min: 6, max: 10 },
    campaigns: { min: 2, max: 3 },
    supportTickets: { min: 8, max: 15 },
    businessEvents: { min: 6, max: 10 },
    annualRevenue: { min: 500_000, max: 8_000_000 },
    documentCount: { min: 12, max: 14 },
  },
  "Medium Enterprise": {
    employeeSample: { min: 25, max: 40 },
    employeeCount: { min: 150, max: 800 },
    products: { min: 15, max: 30 },
    customers: { min: 30, max: 60 },
    suppliers: { min: 8, max: 15 },
    warehouses: { min: 2, max: 3 },
    salesOrders: { min: 40, max: 70 },
    purchaseOrders: { min: 15, max: 25 },
    campaigns: { min: 4, max: 6 },
    supportTickets: { min: 20, max: 35 },
    businessEvents: { min: 8, max: 12 },
    annualRevenue: { min: 20_000_000, max: 150_000_000 },
    documentCount: { min: 16, max: 16 },
  },
  "Large Enterprise": {
    employeeSample: { min: 40, max: 60 },
    employeeCount: { min: 1_500, max: 8_000 },
    products: { min: 30, max: 60 },
    customers: { min: 60, max: 120 },
    suppliers: { min: 15, max: 25 },
    warehouses: { min: 4, max: 6 },
    salesOrders: { min: 80, max: 150 },
    purchaseOrders: { min: 25, max: 45 },
    campaigns: { min: 6, max: 10 },
    supportTickets: { min: 35, max: 60 },
    businessEvents: { min: 10, max: 15 },
    annualRevenue: { min: 300_000_000, max: 3_000_000_000 },
    documentCount: { min: 20, max: 20 },
  },
};

export const COMPANY_SIZES: CompanySize[] = ["SME", "Medium Enterprise", "Large Enterprise"];
