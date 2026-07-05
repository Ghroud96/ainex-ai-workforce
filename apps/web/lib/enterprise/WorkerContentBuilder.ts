import {
  formatCurrency,
  getActiveCampaigns,
  getAtRiskCustomers,
  getLowStockInventory,
  getOpenSupportTickets,
  getOverdueInvoices,
  sumInvoiceAmounts,
} from "@/lib/enterprise/CompanyGenerator";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { INDUSTRY_TEMPLATES } from "@/lib/enterprise/IndustryTemplates";

// The narrative fields below are the actual TypeScript shape
// apps/web/data/workers.ts's DigitalWorker type already defines — this
// file doesn't introduce a new type, it produces instances of the
// existing one. Structural fields (slug/name/department/businessFunction/
// status/capabilities) stay fixed across every industry and size: the
// Digital Workforce's 10 roles are universal, only their narrative
// content is company-specific — see docs/architecture/enterprise-demo.md
// for why (capabilities feed the Planning Engine's CapabilityPlanner,
// and department strings are matched elsewhere for retrieval scoping and
// document usedBy filtering; changing either would risk perturbing
// engines this milestone must not touch).
interface WorkerRole {
  slug: string;
  name: string;
  department: string;
  businessFunction: string;
  status: "Available" | "In Development" | "Coming Soon";
  capabilities: (
    | "Can Answer Questions"
    | "Can Generate Reports"
    | "Can Trigger Workflows"
    | "Can Recommend Actions"
    | "Can Monitor KPIs"
  )[];
  baseTools: string[];
  roleTitle: string;
}

const WORKER_ROLES: WorkerRole[] = [
  {
    slug: "executive",
    name: "Executive Worker",
    department: "Executive Leadership",
    businessFunction: "Executive Reporting & KPI Monitoring",
    status: "Available",
    capabilities: ["Can Answer Questions", "Can Generate Reports", "Can Trigger Workflows", "Can Recommend Actions", "Can Monitor KPIs"],
    baseTools: ["ERP", "Email", "Database"],
    roleTitle: "Chief of Staff",
  },
  {
    slug: "sales",
    name: "Sales Worker",
    department: "Sales",
    businessFunction: "Pipeline Management & Lead Follow-Up",
    status: "Available",
    capabilities: ["Can Answer Questions", "Can Trigger Workflows", "Can Recommend Actions", "Can Monitor KPIs"],
    baseTools: ["Email", "WhatsApp", "Database"],
    roleTitle: "Sales Director",
  },
  {
    slug: "finance",
    name: "Finance Worker",
    department: "Finance",
    businessFunction: "Invoice & Cash Flow Monitoring",
    status: "Available",
    capabilities: ["Can Answer Questions", "Can Generate Reports", "Can Trigger Workflows", "Can Recommend Actions", "Can Monitor KPIs"],
    baseTools: ["ERP", "Email", "Database"],
    roleTitle: "Finance Manager",
  },
  {
    slug: "inventory",
    name: "Inventory Worker",
    department: "Supply Chain",
    businessFunction: "Stock Level & Reorder Monitoring",
    status: "In Development",
    capabilities: ["Can Trigger Workflows", "Can Recommend Actions", "Can Monitor KPIs"],
    baseTools: ["ERP", "Email"],
    roleTitle: "Inventory Manager",
  },
  {
    slug: "hr",
    name: "HR Worker",
    department: "Human Resources",
    businessFunction: "Policy Q&A & Onboarding",
    status: "In Development",
    capabilities: ["Can Answer Questions", "Can Recommend Actions"],
    baseTools: ["Email", "Microsoft 365"],
    roleTitle: "HR Manager",
  },
  {
    slug: "customer-support",
    name: "Customer Support Worker",
    department: "Customer Service",
    businessFunction: "First-Line Customer Support",
    status: "In Development",
    capabilities: ["Can Answer Questions", "Can Trigger Workflows"],
    baseTools: ["Email", "WhatsApp", "Slack"],
    roleTitle: "Support Team Lead",
  },
  {
    slug: "operations",
    name: "Operations Worker",
    department: "Operations",
    businessFunction: "Process & Production Monitoring",
    status: "Coming Soon",
    capabilities: ["Can Monitor KPIs", "Can Recommend Actions"],
    baseTools: ["ERP", "Slack"],
    roleTitle: "Operations Manager",
  },
  {
    slug: "marketing",
    name: "Marketing Worker",
    department: "Marketing",
    businessFunction: "Campaign Performance Tracking",
    status: "Coming Soon",
    capabilities: ["Can Generate Reports", "Can Monitor KPIs", "Can Recommend Actions"],
    baseTools: ["Email", "Google Workspace"],
    roleTitle: "Marketing Manager",
  },
  {
    slug: "procurement",
    name: "Procurement Worker",
    department: "Procurement",
    businessFunction: "Supplier & Contract Monitoring",
    status: "Coming Soon",
    capabilities: ["Can Monitor KPIs", "Can Recommend Actions", "Can Trigger Workflows"],
    baseTools: ["ERP", "Email"],
    roleTitle: "Procurement Manager",
  },
  {
    slug: "compliance",
    name: "Compliance Worker",
    department: "Legal & Compliance",
    businessFunction: "Regulatory & Policy Monitoring",
    status: "Coming Soon",
    capabilities: ["Can Answer Questions", "Can Monitor KPIs", "Can Recommend Actions"],
    baseTools: ["Email", "Database"],
    roleTitle: "Compliance Manager",
  },
];

export interface BuiltWorkerWorkflow {
  name: string;
  description: string;
}

export interface BuiltDigitalWorker {
  slug: string;
  name: string;
  department: string;
  businessFunction: string;
  shortDescription: string;
  businessDescription: string;
  businessValue: string;
  purpose: string;
  status: "Available" | "In Development" | "Coming Soon";
  knowledgeSources: string[];
  workflows: BuiltWorkerWorkflow[];
  tools: string[];
  capabilities: WorkerRole["capabilities"];
}

function buildContentFor(role: WorkerRole, company: GeneratedCompany): Omit<BuiltDigitalWorker, keyof WorkerRole | "capabilities"> & Pick<WorkerRole, "capabilities"> {
  const { profile } = company;
  const currency = profile.currency;

  switch (role.slug) {
    case "executive": {
      const overdue = getOverdueInvoices(company);
      return {
        capabilities: role.capabilities,
        shortDescription: `Monitors ${profile.name}'s company-wide KPIs and summarizes performance across every department.`,
        businessDescription: `The Executive Worker consolidates signals from every other Digital Worker at ${profile.name} into a single daily view of company health, so leadership starts each day with a brief instead of a stack of reports.`,
        businessValue: `Gives ${profile.name}'s leadership a daily executive brief without waiting on manual reporting from every department.`,
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Executive Worker tracks company-wide KPIs — revenue, sales growth, inventory risk, and outstanding financial obligations (currently ${formatCurrency(sumInvoiceAmounts(overdue), currency)} overdue across ${overdue.length} invoice${overdue.length === 1 ? "" : "s"}) — and synthesizes them into a daily executive brief drawing on every other Digital Worker's output.`,
        knowledgeSources: ["Sales Reports", "Financial Reports", "Inventory", "Policies"],
        workflows: [{ name: "Daily Executive Brief", description: `Compiles KPI movement and risk signals from every department at ${profile.name} into a morning summary.` }],
        tools: role.baseTools,
      };
    }
    case "sales": {
      const atRisk = getAtRiskCustomers(company);
      const sampleCustomer = company.customers[0]?.name ?? "a key account";
      return {
        capabilities: role.capabilities,
        shortDescription: `Tracks ${profile.name}'s pipeline, follows up on leads, and flags accounts that need attention.`,
        businessDescription: `The Sales Worker keeps every open opportunity at ${profile.name} moving by watching pipeline stage changes and flagging accounts like ${sampleCustomer} that have gone quiet.`,
        businessValue: "Shortens response time to prospects and reduces missed follow-ups.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Sales Worker monitors the sales pipeline across ${company.customers.length} active accounts, identifies the ${atRisk.length} currently flagged At Risk, and prompts follow-up before an opportunity goes cold.`,
        knowledgeSources: ["CRM", "Sales Reports", "Customer Database"],
        workflows: [{ name: "Lead Follow-up", description: `Notifies the assigned rep when a ${profile.name} lead goes quiet for 7+ days.` }],
        tools: role.baseTools,
      };
    }
    case "finance": {
      const overdue = getOverdueInvoices(company);
      const overdueTotal = sumInvoiceAmounts(overdue);
      return {
        capabilities: role.capabilities,
        shortDescription: `Reviews ${profile.name}'s invoices, expenses, and cash flow, and flags overdue payments.`,
        businessDescription: `The Finance Worker reviews ${profile.name}'s outstanding invoices and expense trends daily, flagging payment risk before it affects cash flow.`,
        businessValue: "Catches overdue invoices and budget risks before they escalate.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Finance Worker monitors invoices, expenses, and cash flow — today flagging ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"} totaling ${formatCurrency(overdueTotal, currency)} — and recommends collection or budget actions before risk compounds.`,
        knowledgeSources: ["Invoices", "Financial Reports", "ERP"],
        workflows: [{ name: "Invoice Reminder", description: `Sends a payment reminder when a ${profile.name} invoice passes its due date.` }],
        tools: role.baseTools,
      };
    }
    case "inventory": {
      const lowStock = getLowStockInventory(company);
      const sampleProduct = company.products[0]?.name ?? "a key offering";
      // Not every industry sells physical, stockable goods — a
      // consulting firm doesn't "reorder" an Advisory Engagement. See
      // IndustryTemplate.tracksInventory.
      const goodsBased = INDUSTRY_TEMPLATES[profile.industry].tracksInventory;

      if (!goodsBased) {
        return {
          capabilities: role.capabilities,
          shortDescription: `Watches ${profile.name}'s service capacity and delivery load, and warns before a location is overbooked.`,
          businessDescription: `The Inventory Worker tracks service capacity across ${profile.name}'s ${company.warehouses.length} location${company.warehouses.length === 1 ? "" : "s"} against healthy limits and warns before a bottleneck affects delivery, such as with ${sampleProduct}.`,
          businessValue: "Prevents delivery bottlenecks and reduces last-minute capacity scrambles.",
          purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Inventory Worker monitors service capacity across every location, comparing it against healthy thresholds — ${lowStock.length} service line${lowStock.length === 1 ? "" : "s"} currently nearing capacity — and flags a capacity review before a bottleneck occurs.`,
          knowledgeSources: ["Operations", "ERP"],
          workflows: [{ name: "Stock Alert", description: `Flags a capacity review when ${profile.name} service load approaches its threshold.` }],
          tools: role.baseTools,
        };
      }

      return {
        capabilities: role.capabilities,
        shortDescription: `Watches ${profile.name}'s stock levels and reorder points, and warns before items run out.`,
        businessDescription: `The Inventory Worker tracks stock levels across ${profile.name}'s ${company.warehouses.length} warehouse${company.warehouses.length === 1 ? "" : "s"} against reorder points and warns before a stockout affects fulfillment, such as with ${sampleProduct}.`,
        businessValue: "Prevents stockouts and reduces emergency reordering costs.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Inventory Worker monitors stock levels across every warehouse, comparing them against reorder thresholds — ${lowStock.length} item${lowStock.length === 1 ? "" : "s"} currently below threshold — and triggers a reorder alert before a shortage occurs.`,
        knowledgeSources: ["Inventory", "ERP"],
        workflows: [{ name: "Stock Alert", description: `Triggers a reorder workflow when ${profile.name} inventory drops below its threshold.` }],
        tools: role.baseTools,
      };
    }
    case "hr": {
      return {
        capabilities: role.capabilities,
        shortDescription: `Answers ${profile.name} employee policy questions and tracks onboarding and leave requests.`,
        businessDescription: `The HR Worker answers common employee questions about ${profile.name}'s policy and tracks onboarding and leave status across ${profile.employeeCount.toLocaleString()} employees so HR staff spend less time on repetitive requests.`,
        businessValue: "Reduces repetitive HR queries and speeds up onboarding.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the HR Worker answers employee questions grounded in company policy, tracks onboarding checklist progress, and monitors leave requests across the organization.`,
        knowledgeSources: ["Policies", "SOP"],
        workflows: [{ name: "Onboarding Checklist Reminder", description: "Notifies a new hire's manager when an onboarding step is overdue." }],
        tools: role.baseTools,
      };
    }
    case "customer-support": {
      const open = getOpenSupportTickets(company);
      return {
        capabilities: role.capabilities,
        shortDescription: `Handles common ${profile.name} customer questions and escalates complex issues to a human agent.`,
        businessDescription: `The Customer Support Worker resolves common customer questions directly and escalates anything outside its scope to a human agent with full context attached.`,
        businessValue: "Cuts first-response time and lowers support ticket volume.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Customer Support Worker answers frequently asked customer questions from the Knowledge Hub and escalates unresolved or sensitive issues — ${open.length} ticket${open.length === 1 ? "" : "s"} currently open — to a human agent.`,
        knowledgeSources: ["Customer Database", "SOP", "Policies"],
        workflows: [{ name: "Customer Escalation", description: "Routes an unresolved ticket to the right human agent with full conversation context." }],
        tools: role.baseTools,
      };
    }
    case "operations": {
      return {
        capabilities: role.capabilities,
        shortDescription: `Monitors ${profile.name}'s production schedules, workflow bottlenecks, and process compliance.`,
        businessDescription: `The Operations Worker watches ${profile.name}'s day-to-day operational processes for delays and compliance gaps, surfacing bottlenecks before they affect output.`,
        businessValue: "Surfaces operational bottlenecks before they cause delays, keeping output on schedule.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Operations Worker monitors production schedules and process SOPs across ${company.warehouses.length} site${company.warehouses.length === 1 ? "" : "s"}, identifying bottlenecks or compliance gaps and flagging them to the operations team.`,
        knowledgeSources: ["SOP", "ERP", "Inventory"],
        workflows: [{ name: "Production Delay Alert", description: "Notifies the operations lead when a scheduled process falls behind." }],
        tools: role.baseTools,
      };
    }
    case "marketing": {
      const active = getActiveCampaigns(company);
      return {
        capabilities: role.capabilities,
        shortDescription: `Tracks ${profile.name}'s campaign performance, audience engagement, and content pipeline.`,
        businessDescription: `The Marketing Worker tracks how ${profile.name}'s campaigns are performing across channels and highlights where budget is working hardest.`,
        businessValue: "Shows which campaigns are working in real time, so budget shifts to what performs.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Marketing Worker tracks performance across ${active.length} active campaign${active.length === 1 ? "" : "s"} and audience engagement, recommending budget or content adjustments based on what's converting.`,
        knowledgeSources: ["Sales Reports", "Customer Database"],
        workflows: [{ name: "Campaign Performance Digest", description: "Sends a weekly summary of campaign performance to the marketing lead." }],
        tools: role.baseTools,
      };
    }
    case "procurement": {
      return {
        capabilities: role.capabilities,
        shortDescription: `Reviews ${profile.name}'s supplier performance, purchase orders, and contract renewal timelines.`,
        businessDescription: `The Procurement Worker tracks ${profile.name}'s supplier performance and contract timelines so renewal decisions happen with lead time, not under pressure.`,
        businessValue: "Avoids missed renewal deadlines and highlights underperforming suppliers before contracts lock in another cycle.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Procurement Worker monitors purchase orders across ${company.suppliers.length} supplier${company.suppliers.length === 1 ? "" : "s"}, tracking performance and contract renewal dates, and flagging decisions that need attention before a deadline passes.`,
        knowledgeSources: ["ERP", "Policies"],
        workflows: [{ name: "Contract Renewal Reminder", description: "Notifies procurement of an upcoming contract renewal deadline." }],
        tools: role.baseTools,
      };
    }
    case "compliance": {
      return {
        capabilities: role.capabilities,
        shortDescription: `Monitors ${profile.name}'s regulatory obligations, policy adherence, and audit readiness.`,
        businessDescription: `The Compliance Worker checks ${profile.name}'s business activity against internal policy and regulatory obligations, flagging gaps ahead of an audit rather than during one.`,
        businessValue: "Reduces compliance risk by catching policy gaps before an external audit does.",
        purpose: `Acting as ${role.roleTitle} for ${profile.name}, the Compliance Worker monitors adherence to internal policy and regulatory obligations, flagging gaps or upcoming audit requirements to the compliance team.`,
        knowledgeSources: ["Policies", "SOP"],
        workflows: [{ name: "Policy Gap Alert", description: "Flags an activity that doesn't match documented policy for compliance review." }],
        tools: role.baseTools,
      };
    }
    default:
      throw new Error(`Unhandled worker role: ${role.slug}`);
  }
}

export function buildWorkersFromCompany(company: GeneratedCompany): BuiltDigitalWorker[] {
  return WORKER_ROLES.map((role) => {
    const content = buildContentFor(role, company);
    return {
      slug: role.slug,
      name: role.name,
      department: role.department,
      businessFunction: role.businessFunction,
      status: role.status,
      ...content,
    };
  });
}

// Referenced by NarrativeBuilder.ts so a worker's "Today's Work" section
// can address it the way a Director would recognize — "the Finance
// Manager reviewed..." — without duplicating this table.
export function getRoleTitle(workerId: string): string {
  return WORKER_ROLES.find((role) => role.slug === workerId)?.roleTitle ?? "Digital Worker";
}
