import type { CompanySize, Customer, GeneratedCompanyProfile } from "@/lib/enterprise/EnterpriseTypes";
import {
  WORKER_IDS,
  type AssignedApproval,
  type AssignedMeeting,
  type AssignedTask,
  type DepartmentWorkerId,
  type EnterpriseUser,
  type RoleLevel,
  type UserStatus,
} from "@/lib/enterprise/EnterpriseUserTypes";
import { FIRST_NAMES, LAST_NAMES } from "@/lib/enterprise/NamePools";
import type { Rng } from "@/lib/enterprise/seededRandom";

const HEADCOUNT_RANGE: Record<CompanySize, { min: number; max: number }> = {
  SME: { min: 2, max: 3 },
  "Medium Enterprise": { min: 3, max: 4 },
  "Large Enterprise": { min: 4, max: 6 },
};

const EXECUTIVE_TITLES = ["CEO", "COO", "CFO", "CTO", "CHRO"];

type NonExecutiveDepartment = Exclude<DepartmentWorkerId, "executive">;

const DEPARTMENT_TITLES: Record<NonExecutiveDepartment, { manager: string; staff: [string, string] }> = {
  sales: { manager: "Sales Manager", staff: ["Sales Executive", "Senior Sales Executive"] },
  finance: { manager: "Finance Manager", staff: ["Finance Executive", "Senior Finance Executive"] },
  inventory: { manager: "Inventory Manager", staff: ["Inventory Executive", "Senior Inventory Executive"] },
  hr: { manager: "HR Manager", staff: ["HR Executive", "Senior HR Executive"] },
  "customer-support": {
    manager: "Customer Support Manager",
    staff: ["Customer Support Executive", "Senior Customer Support Executive"],
  },
  operations: { manager: "Operations Manager", staff: ["Operations Executive", "Senior Operations Executive"] },
  marketing: { manager: "Marketing Manager", staff: ["Marketing Executive", "Senior Marketing Executive"] },
  procurement: { manager: "Procurement Manager", staff: ["Procurement Executive", "Senior Procurement Executive"] },
  compliance: { manager: "Compliance Manager", staff: ["Compliance Executive", "Senior Compliance Executive"] },
};

const GENERIC_TASK_TEMPLATES: Record<DepartmentWorkerId, string[]> = {
  executive: ["Review company-wide KPI dashboard", "Prepare board update", "Approve quarterly budget revisions"],
  sales: ["Follow up on {customer}", "Update CRM notes for {customer}", "Prepare renewal proposal for {customer}"],
  finance: ["Review overdue invoice aging report", "Reconcile monthly ledger", "Prepare finance variance report"],
  inventory: ["Audit warehouse stock levels", "Review reorder point exceptions", "Coordinate with suppliers on lead times"],
  hr: ["Prepare onboarding packet for new hire", "Review leave requests", "Update training compliance tracker"],
  "customer-support": ["Clear open ticket backlog", "Review escalated support cases", "Update support macros"],
  operations: ["Review process efficiency report", "Coordinate cross-department handoff", "Audit SOP compliance"],
  marketing: ["Review campaign performance", "Prepare content calendar", "Coordinate brand asset review"],
  procurement: ["Review supplier scorecards", "Negotiate purchase order terms", "Audit vendor compliance"],
  compliance: ["Review regulatory filing checklist", "Audit policy compliance", "Prepare compliance report"],
};

const MEETING_TITLES: Record<DepartmentWorkerId, string[]> = {
  executive: ["Board Sync", "Leadership Weekly", "Quarterly Strategy Review"],
  sales: ["Pipeline Review", "Customer Check-in", "Deal Desk Sync"],
  finance: ["Budget Review", "Month-End Close Sync", "Audit Prep Meeting"],
  inventory: ["Warehouse Ops Review", "Supplier Coordination Call", "Stock Planning Sync"],
  hr: ["Hiring Panel", "Performance Review Sync", "Policy Update Briefing"],
  "customer-support": ["Support Escalation Review", "Ticket Backlog Sync", "CSAT Review"],
  operations: ["Process Improvement Review", "Cross-Department Sync", "Vendor Ops Call"],
  marketing: ["Campaign Planning", "Brand Review", "Content Calendar Sync"],
  procurement: ["Vendor Negotiation Call", "Contract Review", "Sourcing Strategy Sync"],
  compliance: ["Regulatory Review", "Policy Audit Meeting", "Risk Committee Sync"],
};

const APPROVAL_TITLES: Record<DepartmentWorkerId, string[]> = {
  executive: ["Quarterly Budget Approval", "Strategic Hire Approval", "Capital Expenditure Approval"],
  sales: ["Discount Exception Approval", "Contract Terms Approval"],
  finance: ["Expense Report Approval", "Payment Release Approval"],
  inventory: ["Purchase Order Approval", "Inventory Write-off Approval"],
  hr: ["Leave Request Approval", "Headcount Requisition Approval"],
  "customer-support": ["Refund Approval", "Escalation Resolution Approval"],
  operations: ["Process Change Approval", "Vendor Onboarding Approval"],
  marketing: ["Campaign Budget Approval", "Creative Sign-off"],
  procurement: ["Supplier Contract Approval", "Purchase Requisition Approval"],
  compliance: ["Policy Exception Approval", "Audit Finding Sign-off"],
};

const MEETING_TIMES = ["9:00 AM", "10:30 AM", "1:00 PM", "2:30 PM", "4:00 PM"];
const PRIORITIES: AssignedTask["priority"][] = ["Low", "Medium", "High"];

function randomName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function pickStatus(rng: Rng): UserStatus {
  return rng.weighted([
    { value: "Active" as const, weight: 85 },
    { value: "On Leave" as const, weight: 10 },
    { value: "Inactive" as const, weight: 5 },
  ]);
}

function daysFromNow(rng: Rng, minDays: number, maxDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + rng.range(minDays, maxDays));
  return date.toISOString().slice(0, 10);
}

function buildTasks(rng: Rng, user: EnterpriseUser, customerNames: string[]): AssignedTask[] {
  const templates = GENERIC_TASK_TEMPLATES[user.departmentWorkerId];
  const count = rng.range(2, 4);

  return Array.from({ length: count }, (_, index) => {
    let title = rng.pick(templates);
    if (title.includes("{customer}")) {
      title = title.replace("{customer}", customerNames.length > 0 ? rng.pick(customerNames) : "a key account");
    }
    return {
      id: `${user.id}-task-${index + 1}`,
      title,
      dueDate: daysFromNow(rng, 1, 10),
      priority: rng.pick(PRIORITIES),
    };
  });
}

function buildMeetings(rng: Rng, user: EnterpriseUser): AssignedMeeting[] {
  const titles = MEETING_TITLES[user.departmentWorkerId];
  const count = rng.range(1, 3);

  return Array.from({ length: count }, (_, index) => ({
    id: `${user.id}-meeting-${index + 1}`,
    title: rng.pick(titles),
    withWhom: user.managerName ?? "Leadership Team",
    date: daysFromNow(rng, 0, 7),
    time: rng.pick(MEETING_TIMES),
  }));
}

function buildApprovals(rng: Rng, user: EnterpriseUser): AssignedApproval[] {
  const titles = APPROVAL_TITLES[user.departmentWorkerId];
  const count = rng.range(0, 2);

  return Array.from({ length: count }, (_, index) => ({
    id: `${user.id}-approval-${index + 1}`,
    title: rng.pick(titles),
    requestedBy: randomName(rng),
    dueDate: daysFromNow(rng, 1, 14),
  }));
}

// Generates a fully deterministic Enterprise User roster (~20-60 people
// across the 10 Digital Worker departments, scaled by company size),
// reusing the same seeded rng already driving the rest of generateCompany()
// so the whole company — including its simulated org chart — regenerates
// consistently from one seed. The Executive department is generated first
// so its CEO's name is available as every other department's manager root.
export function generateEnterpriseUsers(
  rng: Rng,
  profile: GeneratedCompanyProfile,
  customers: Customer[],
  size: CompanySize,
): EnterpriseUser[] {
  const range = HEADCOUNT_RANGE[size];
  const regionPool = Array.from(new Set(customers.map((customer) => customer.region)));
  const users: EnterpriseUser[] = [];
  let userCounter = 0;
  let ceoName = "";

  function nextId(): string {
    userCounter += 1;
    return `user-${userCounter}`;
  }

  function pickRegion(): string {
    return regionPool.length > 0 ? rng.pick(regionPool) : profile.hqRegion;
  }

  const executiveCount = rng.range(range.min, range.max);
  // The top-of-org person (index 0, managerName: null) must actually carry
  // the "CEO" title — pickN doesn't preserve order, so titles for every
  // OTHER executive are drawn separately from the remaining pool, rather
  // than risking a non-CEO title landing on the person everyone else
  // reports to.
  const otherExecutiveTitles = rng.pickN(
    EXECUTIVE_TITLES.filter((title) => title !== "CEO"),
    Math.max(executiveCount - 1, 0),
  );
  const executiveUsers: EnterpriseUser[] = [];

  for (let i = 0; i < executiveCount; i += 1) {
    const isCeo = i === 0;
    const name = randomName(rng);
    if (isCeo) ceoName = name;

    executiveUsers.push({
      id: nextId(),
      name,
      departmentWorkerId: "executive",
      role: isCeo ? "CEO" : (otherExecutiveTitles[i - 1] ?? "Executive"),
      roleLevel: "Executive",
      region: pickRegion(),
      managerName: isCeo ? null : ceoName,
      status: pickStatus(rng),
      assignedCustomerIds: [],
      assignedTasks: [],
      assignedMeetings: [],
      assignedApprovals: [],
    });
  }
  users.push(...executiveUsers);

  const otherDepartmentIds = WORKER_IDS.filter(
    (id): id is NonExecutiveDepartment => id !== "executive",
  );

  for (const departmentId of otherDepartmentIds) {
    const count = rng.range(range.min, range.max);
    const titles = DEPARTMENT_TITLES[departmentId];
    const departmentUsers: EnterpriseUser[] = [];

    for (let i = 0; i < count; i += 1) {
      const isManager = i === 0;
      const roleLevel: RoleLevel = isManager ? "Manager" : "Staff";
      const role = isManager
        ? titles.manager
        : rng.weighted([
            { value: titles.staff[0], weight: 60 },
            { value: titles.staff[1], weight: 40 },
          ]);

      departmentUsers.push({
        id: nextId(),
        name: randomName(rng),
        departmentWorkerId: departmentId,
        role,
        roleLevel,
        region: pickRegion(),
        managerName: isManager ? ceoName : (departmentUsers[0]?.name ?? ceoName),
        status: pickStatus(rng),
        assignedCustomerIds: [],
        assignedTasks: [],
        assignedMeetings: [],
        assignedApprovals: [],
      });
    }

    if (departmentId === "sales" && customers.length > 0) {
      const sliceSize = Math.max(1, Math.ceil(customers.length / departmentUsers.length));
      departmentUsers.forEach((user, index) => {
        const start = index * sliceSize;
        user.assignedCustomerIds = customers.slice(start, start + sliceSize).map((customer) => customer.id);
      });
    }

    users.push(...departmentUsers);
  }

  for (const user of users) {
    const customerNames = user.assignedCustomerIds
      .map((id) => customers.find((customer) => customer.id === id)?.name)
      .filter((name): name is string => Boolean(name));

    user.assignedTasks = buildTasks(rng, user, customerNames);
    user.assignedMeetings = buildMeetings(rng, user);
    user.assignedApprovals = user.roleLevel === "Staff" ? [] : buildApprovals(rng, user);
  }

  return users;
}
