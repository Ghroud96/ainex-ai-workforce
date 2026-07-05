import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";

export type CompanySize = "SME" | "Medium Enterprise" | "Large Enterprise";

export type Industry =
  | "Agriculture"
  | "Manufacturing"
  | "Healthcare"
  | "Retail"
  | "Beauty & Wellness"
  | "Logistics"
  | "Construction"
  | "Government"
  | "Technology"
  | "Professional Services";

export interface GeneratedCompanyProfile {
  id: string;
  name: string;
  industry: Industry;
  size: CompanySize;
  tagline: string;
  description: string;
  foundedYear: number;
  hqCity: string;
  hqRegion: string;
  currency: string;
  employeeCount: number;
  annualRevenue: number;
  fiscalYearLabel: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  seniority: "Junior" | "Mid" | "Senior" | "Lead" | "Executive";
  email: string;
  startDate: string;
  location: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  unitCost: number;
  status: "Active" | "Discontinued" | "Seasonal";
}

export interface Customer {
  id: string;
  name: string;
  segment: string;
  contactName: string;
  contactEmail: string;
  region: string;
  lifetimeValue: number;
  status: "Active" | "At Risk" | "Churned" | "New";
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  region: string;
  reliabilityScore: number;
  leadTimeDays: number;
  status: "Active" | "Under Review" | "Inactive";
}

export interface Warehouse {
  id: string;
  name: string;
  city: string;
  region: string;
  capacityUnits: number;
  utilizationPct: number;
}

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: "Healthy" | "Low" | "Critical" | "Overstocked";
}

export interface SalesOrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  orderDate: string;
  status: "Pending" | "Fulfilled" | "Shipped" | "Cancelled";
  lineItems: SalesOrderLine[];
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  status: "Draft" | "Sent" | "Received" | "Cancelled";
  totalAmount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  salesOrderId?: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: "Paid" | "Outstanding" | "Overdue" | "Draft";
}

export interface FinancialSummary {
  fiscalPeriod: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  cashOnHand: number;
  outstandingReceivables: number;
  revenueTrendPct: number;
  expenseTrendPct: number;
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: "Planned" | "Active" | "Completed" | "Paused";
  startDate: string;
  endDate: string;
  budget: number;
  leadsGenerated: number;
  conversionRate: number;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  subject: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Escalated";
  createdAt: string;
  channel: string;
}

export interface BusinessEvent {
  id: string;
  date: string;
  category: "Risk" | "Opportunity" | "Milestone" | "Operational";
  title: string;
  description: string;
  relatedWorkerId?: string;
  relatedEntityId?: string;
}

export interface GeneratedCompany {
  profile: GeneratedCompanyProfile;
  employees: Employee[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  financials: FinancialSummary;
  campaigns: Campaign[];
  supportTickets: SupportTicket[];
  events: BusinessEvent[];
  enterpriseUsers: EnterpriseUser[];
}
