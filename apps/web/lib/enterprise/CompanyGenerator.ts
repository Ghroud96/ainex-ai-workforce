import { COMPANY_SIZE_TIERS, type Range } from "@/lib/enterprise/CompanySizeTiers";
import type {
  BusinessEvent,
  Campaign,
  CompanySize,
  Customer,
  Employee,
  FinancialSummary,
  GeneratedCompany,
  GeneratedCompanyProfile,
  Industry,
  Invoice,
  InventoryItem,
  Product,
  PurchaseOrder,
  SalesOrder,
  Supplier,
  SupportTicket,
  Warehouse,
} from "@/lib/enterprise/EnterpriseTypes";
import { generateEnterpriseUsers } from "@/lib/enterprise/EnterpriseUserGenerator";
import { INDUSTRY_TEMPLATES, type IndustryTemplate } from "@/lib/enterprise/IndustryTemplates";
import { FIRST_NAMES, LAST_NAMES } from "@/lib/enterprise/NamePools";
import { createRng, type Rng } from "@/lib/enterprise/seededRandom";

const SENIORITIES: Employee["seniority"][] = ["Junior", "Mid", "Senior", "Lead", "Executive"];
const REGION_LOCATIONS = ["Kuala Lumpur HQ", "Penang Office", "Johor Bahru Branch", "Remote"];

function pickRange(rng: Rng, range: Range): number {
  return rng.range(range.min, range.max);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateProfile(rng: Rng, template: IndustryTemplate, industry: Industry, size: CompanySize): GeneratedCompanyProfile {
  const tier = COMPANY_SIZE_TIERS[size];
  const name = rng.pick(template.companyNames);
  const hq = rng.pick(template.hqCities);
  const currentYear = new Date().getFullYear();
  const founded = currentYear - rng.range(5, 35);
  const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

  return {
    id: slugify(name),
    name,
    industry,
    size,
    tagline: rng.pick(template.taglines),
    description: `${name} is a ${size.toLowerCase()} ${industry.toLowerCase()} business headquartered in ${hq.city}, ${hq.region}, operating since ${founded}.`,
    foundedYear: founded,
    hqCity: hq.city,
    hqRegion: hq.region,
    currency: "RM",
    employeeCount: pickRange(rng, tier.employeeCount),
    annualRevenue: pickRange(rng, tier.annualRevenue),
    fiscalYearLabel: `Q${currentQuarter} ${currentYear}`,
  };
}

function generateEmployees(rng: Rng, template: IndustryTemplate, size: CompanySize): Employee[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.employeeSample);
  const employees: Employee[] = [];

  for (let i = 0; i < count; i += 1) {
    const deptGroup = rng.pick(template.employeeDepartments);
    const role = rng.pick(deptGroup.titles);
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);
    const name = `${first} ${last}`;
    const startDaysAgo = rng.range(30, 3000);

    employees.push({
      id: `emp-${i + 1}`,
      name,
      role,
      department: deptGroup.department,
      seniority: rng.pick(SENIORITIES),
      email: `${first.toLowerCase().replace(/\s+/g, "")}.${last.toLowerCase()}@company.com`,
      startDate: daysAgo(startDaysAgo),
      location: rng.pick(REGION_LOCATIONS),
    });
  }

  return employees;
}

function generateProducts(rng: Rng, template: IndustryTemplate, size: CompanySize): Product[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = Math.min(pickRange(rng, tier.products), template.productNamePool.length);
  const names = rng.pickN(template.productNamePool, count);

  return names.map((name, index) => {
    const unitCost = rng.rangeFloat(8, 400, 2);
    const margin = rng.rangeFloat(1.2, 2.1, 2);

    return {
      id: `prod-${index + 1}`,
      sku: `SKU-${1000 + index}`,
      name,
      category: rng.pick(template.productCategories),
      unitCost,
      unitPrice: Math.round(unitCost * margin * 100) / 100,
      status: rng.weighted([
        { value: "Active" as const, weight: 85 },
        { value: "Seasonal" as const, weight: 10 },
        { value: "Discontinued" as const, weight: 5 },
      ]),
    };
  });
}

function generateCustomers(rng: Rng, template: IndustryTemplate, size: CompanySize): Customer[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.customers);
  const namePool = template.customerNamePool;

  return Array.from({ length: count }, (_, index) => {
    const baseName = namePool[index % namePool.length];
    const name = index < namePool.length ? baseName : `${baseName} #${Math.floor(index / namePool.length) + 1}`;
    const first = rng.pick(FIRST_NAMES);
    const last = rng.pick(LAST_NAMES);

    return {
      id: `cust-${index + 1}`,
      name,
      segment: rng.pick(template.customerSegments),
      contactName: `${first} ${last}`,
      contactEmail: `${first.toLowerCase()}.${last.toLowerCase()}@${slugify(name).slice(0, 14)}.com`,
      region: rng.pick(template.hqCities).region,
      lifetimeValue: rng.range(5_000, 900_000),
      status: rng.weighted([
        { value: "Active" as const, weight: 70 },
        { value: "New" as const, weight: 15 },
        { value: "At Risk" as const, weight: 10 },
        { value: "Churned" as const, weight: 5 },
      ]),
    };
  });
}

function generateSuppliers(rng: Rng, template: IndustryTemplate, size: CompanySize): Supplier[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = Math.min(pickRange(rng, tier.suppliers), template.supplierNamePool.length);
  const names = rng.pickN(template.supplierNamePool, count);

  return names.map((name, index) => ({
    id: `supp-${index + 1}`,
    name,
    category: rng.pick(template.supplierCategories),
    region: rng.pick(template.hqCities).region,
    reliabilityScore: rng.range(65, 99),
    leadTimeDays: rng.range(2, 45),
    status: rng.weighted([
      { value: "Active" as const, weight: 85 },
      { value: "Under Review" as const, weight: 12 },
      { value: "Inactive" as const, weight: 3 },
    ]),
  }));
}

function generateWarehouses(rng: Rng, template: IndustryTemplate, size: CompanySize): Warehouse[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.warehouses);
  const cities = rng.pickN(template.hqCities, Math.max(count, 1));

  return Array.from({ length: count }, (_, index) => {
    const location = cities[index % cities.length];
    const capacity = rng.range(5_000, 200_000);

    return {
      id: `wh-${index + 1}`,
      name: `${location.city} ${template.facilityLabel}${count > 1 ? ` ${index + 1}` : ""}`,
      city: location.city,
      region: location.region,
      capacityUnits: capacity,
      utilizationPct: rng.range(45, 95),
    };
  });
}

function generateInventory(rng: Rng, products: Product[], warehouses: Warehouse[]): InventoryItem[] {
  const items: InventoryItem[] = [];
  let counter = 0;

  for (const warehouse of warehouses) {
    for (const product of products) {
      counter += 1;
      const reorderPoint = rng.range(50, 500);
      const quantityOnHand = rng.range(0, reorderPoint * 5);

      let status: InventoryItem["status"] = "Healthy";
      if (quantityOnHand < reorderPoint * 0.5) status = "Critical";
      else if (quantityOnHand < reorderPoint) status = "Low";
      else if (quantityOnHand > reorderPoint * 4) status = "Overstocked";

      items.push({
        id: `inv-${counter}`,
        productId: product.id,
        warehouseId: warehouse.id,
        quantityOnHand,
        reorderPoint,
        reorderQuantity: reorderPoint * 2,
        status,
      });
    }
  }

  return items;
}

function generateSalesOrders(rng: Rng, products: Product[], customers: Customer[], size: CompanySize): SalesOrder[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.salesOrders);

  return Array.from({ length: count }, (_, index) => {
    const customer = rng.pick(customers);
    const lineItemCount = rng.range(1, 4);
    const lineItems = Array.from({ length: lineItemCount }, () => {
      const product = rng.pick(products);
      return { productId: product.id, quantity: rng.range(5, 200), unitPrice: product.unitPrice };
    });
    const totalAmount = Math.round(lineItems.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) * 100) / 100;

    return {
      id: `so-${index + 1}`,
      orderNumber: `SO-${10000 + index}`,
      customerId: customer.id,
      orderDate: daysAgo(rng.range(1, 90)),
      status: rng.weighted([
        { value: "Fulfilled" as const, weight: 45 },
        { value: "Shipped" as const, weight: 30 },
        { value: "Pending" as const, weight: 20 },
        { value: "Cancelled" as const, weight: 5 },
      ]),
      lineItems,
      totalAmount,
    };
  });
}

function generatePurchaseOrders(rng: Rng, suppliers: Supplier[], size: CompanySize): PurchaseOrder[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.purchaseOrders);

  return Array.from({ length: count }, (_, index) => {
    const supplier = rng.pick(suppliers);
    const orderedDaysAgo = rng.range(1, 60);

    return {
      id: `po-${index + 1}`,
      orderNumber: `PO-${5000 + index}`,
      supplierId: supplier.id,
      orderDate: daysAgo(orderedDaysAgo),
      expectedDate: daysFromNow(supplier.leadTimeDays - orderedDaysAgo),
      status: rng.weighted([
        { value: "Received" as const, weight: 50 },
        { value: "Sent" as const, weight: 30 },
        { value: "Draft" as const, weight: 15 },
        { value: "Cancelled" as const, weight: 5 },
      ]),
      totalAmount: rng.range(2_000, 180_000),
    };
  });
}

function generateInvoices(rng: Rng, salesOrders: SalesOrder[]): Invoice[] {
  return salesOrders
    .filter((order) => order.status !== "Cancelled")
    .map((order, index) => {
      const issueDaysAgo = rng.range(1, 75);
      const dueInDays = 30;
      const dueDaysAgo = issueDaysAgo - dueInDays;
      const status = rng.weighted([
        { value: "Paid" as const, weight: 55 },
        { value: "Outstanding" as const, weight: 25 },
        { value: "Overdue" as const, weight: 15 },
        { value: "Draft" as const, weight: 5 },
      ]);

      return {
        id: `inv-doc-${index + 1}`,
        invoiceNumber: `INV-${new Date().getFullYear()}-${1000 + index}`,
        customerId: order.customerId,
        salesOrderId: order.id,
        issueDate: daysAgo(issueDaysAgo),
        dueDate: dueDaysAgo > 0 ? daysAgo(dueDaysAgo) : daysFromNow(-dueDaysAgo),
        amount: order.totalAmount,
        status: status === "Overdue" && dueDaysAgo <= 0 ? "Outstanding" : status,
      };
    });
}

function generateFinancials(rng: Rng, profile: GeneratedCompanyProfile, invoices: Invoice[]): FinancialSummary {
  const quarterlyRevenue = Math.round(profile.annualRevenue / 4);
  const expenseRatio = rng.rangeFloat(0.68, 0.87, 2);
  const expenses = Math.round(quarterlyRevenue * expenseRatio);
  const outstandingReceivables = Math.round(
    invoices
      .filter((invoice) => invoice.status === "Outstanding" || invoice.status === "Overdue")
      .reduce((sum, invoice) => sum + invoice.amount, 0),
  );

  return {
    fiscalPeriod: profile.fiscalYearLabel,
    revenue: quarterlyRevenue,
    expenses,
    netIncome: quarterlyRevenue - expenses,
    cashOnHand: Math.round(quarterlyRevenue * rng.rangeFloat(0.4, 1.3, 2)),
    outstandingReceivables,
    revenueTrendPct: rng.rangeFloat(-4, 22, 1),
    expenseTrendPct: rng.rangeFloat(-3, 12, 1),
  };
}

function generateCampaigns(rng: Rng, template: IndustryTemplate, size: CompanySize): Campaign[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.campaigns);

  return Array.from({ length: count }, (_, index) => {
    const startDaysAgo = rng.range(10, 90);

    return {
      id: `camp-${index + 1}`,
      name: `${rng.pick(template.productCategories)} ${rng.pick(["Growth Push", "Awareness Drive", "Launch Campaign", "Renewal Campaign", "Season Kickoff"])}`,
      channel: rng.pick(template.campaignChannels),
      status: rng.weighted([
        { value: "Active" as const, weight: 40 },
        { value: "Completed" as const, weight: 40 },
        { value: "Planned" as const, weight: 15 },
        { value: "Paused" as const, weight: 5 },
      ]),
      startDate: daysAgo(startDaysAgo),
      endDate: daysFromNow(rng.range(-10, 60)),
      budget: rng.range(3_000, 250_000),
      leadsGenerated: rng.range(20, 4_000),
      conversionRate: rng.rangeFloat(1, 18, 1),
    };
  });
}

function generateSupportTickets(rng: Rng, template: IndustryTemplate, customers: Customer[], size: CompanySize): SupportTicket[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.supportTickets);

  return Array.from({ length: count }, (_, index) => ({
    id: `tkt-${index + 1}`,
    ticketNumber: `TCK-${8000 + index}`,
    customerId: rng.pick(customers).id,
    subject: rng.pick(template.ticketSubjects),
    priority: rng.weighted([
      { value: "Low" as const, weight: 30 },
      { value: "Medium" as const, weight: 40 },
      { value: "High" as const, weight: 22 },
      { value: "Urgent" as const, weight: 8 },
    ]),
    status: rng.weighted([
      { value: "Resolved" as const, weight: 55 },
      { value: "In Progress" as const, weight: 25 },
      { value: "Open" as const, weight: 15 },
      { value: "Escalated" as const, weight: 5 },
    ]),
    createdAt: daysAgo(rng.range(0, 30)),
    channel: rng.pick(["Email", "Phone", "Chat", "WhatsApp"]),
  }));
}

function generateBusinessEvents(
  rng: Rng,
  template: IndustryTemplate,
  size: CompanySize,
  entities: { products: Product[]; customers: Customer[]; suppliers: Supplier[] },
): BusinessEvent[] {
  const tier = COMPANY_SIZE_TIERS[size];
  const count = pickRange(rng, tier.businessEvents);
  const events: BusinessEvent[] = [];

  const categoryPools: { category: BusinessEvent["category"]; scenarios: string[]; weight: number }[] = [
    { category: "Risk", scenarios: template.riskScenarios, weight: 40 },
    { category: "Opportunity", scenarios: template.opportunityScenarios, weight: 25 },
    { category: "Milestone", scenarios: template.milestoneScenarios, weight: 15 },
    { category: "Operational", scenarios: template.operationalScenarios, weight: 20 },
  ];

  for (let i = 0; i < count; i += 1) {
    const pool = rng.weighted(categoryPools.map((p) => ({ value: p, weight: p.weight })));
    const scenario = rng.pick(pool.scenarios);
    const product = rng.pick(entities.products);
    const customer = rng.pick(entities.customers);
    const supplier = rng.pick(entities.suppliers);
    const title = fillTemplate(scenario, { product: product.name, customer: customer.name, supplier: supplier.name });

    events.push({
      id: `event-${i + 1}`,
      date: daysAgo(rng.range(0, 21)),
      category: pool.category,
      title,
      description: title,
      relatedEntityId: product.id,
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export function generateCompany(industry: Industry, size: CompanySize): GeneratedCompany {
  const rng = createRng(`${industry}::${size}`);
  const template = INDUSTRY_TEMPLATES[industry];

  const profile = generateProfile(rng, template, industry, size);
  const employees = generateEmployees(rng, template, size);
  const products = generateProducts(rng, template, size);
  const customers = generateCustomers(rng, template, size);
  const suppliers = generateSuppliers(rng, template, size);
  const warehouses = generateWarehouses(rng, template, size);
  const inventory = generateInventory(rng, products, warehouses);
  const salesOrders = generateSalesOrders(rng, products, customers, size);
  const purchaseOrders = generatePurchaseOrders(rng, suppliers, size);
  const invoices = generateInvoices(rng, salesOrders);
  const financials = generateFinancials(rng, profile, invoices);
  const campaigns = generateCampaigns(rng, template, size);
  const supportTickets = generateSupportTickets(rng, template, customers, size);
  const events = generateBusinessEvents(rng, template, size, { products, customers, suppliers });
  const enterpriseUsers = generateEnterpriseUsers(rng, profile, customers, size);

  return {
    profile,
    employees,
    products,
    customers,
    suppliers,
    warehouses,
    inventory,
    salesOrders,
    purchaseOrders,
    invoices,
    financials,
    campaigns,
    supportTickets,
    events,
    enterpriseUsers,
  };
}

// Shared read-only metrics over a GeneratedCompany — deliberately the
// single place these are computed. WorkerContentBuilder, DocumentContentBuilder,
// and NarrativeBuilder all call these instead of each recomputing their
// own version, so a number quoted on the Dashboard always matches the
// same number a worker's own page/persona references (see the North
// Star's internal-consistency requirement).
export function getOverdueInvoices(company: GeneratedCompany): Invoice[] {
  return company.invoices.filter((invoice) => invoice.status === "Overdue");
}

export function getOutstandingInvoices(company: GeneratedCompany): Invoice[] {
  return company.invoices.filter((invoice) => invoice.status === "Outstanding" || invoice.status === "Overdue");
}

export function sumInvoiceAmounts(invoices: Invoice[]): number {
  return Math.round(invoices.reduce((sum, invoice) => sum + invoice.amount, 0));
}

export function getLowStockInventory(company: GeneratedCompany): InventoryItem[] {
  return company.inventory.filter((item) => item.status === "Low" || item.status === "Critical");
}

export function getOpenSupportTickets(company: GeneratedCompany): SupportTicket[] {
  return company.supportTickets.filter((ticket) => ticket.status === "Open" || ticket.status === "Escalated");
}

export function getAtRiskCustomers(company: GeneratedCompany): Customer[] {
  return company.customers.filter((customer) => customer.status === "At Risk");
}

export function getActiveCampaigns(company: GeneratedCompany): Campaign[] {
  return company.campaigns.filter((campaign) => campaign.status === "Active");
}

export function findProductName(company: GeneratedCompany, productId: string): string {
  return company.products.find((product) => product.id === productId)?.name ?? "a product";
}

export function findCustomerName(company: GeneratedCompany, customerId: string): string {
  return company.customers.find((customer) => customer.id === customerId)?.name ?? "a customer";
}

export function findSupplierName(company: GeneratedCompany, supplierId: string): string {
  return company.suppliers.find((supplier) => supplier.id === supplierId)?.name ?? "a supplier";
}

export function findWarehouseName(company: GeneratedCompany, warehouseId: string): string {
  return company.warehouses.find((warehouse) => warehouse.id === warehouseId)?.name ?? "the warehouse";
}

export function formatCurrency(amount: number, currency = "RM"): string {
  return `${currency}${Math.round(amount).toLocaleString("en-US")}`;
}
