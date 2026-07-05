// The canonical department taxonomy for Enterprise Users is the 10
// existing Digital Worker ids — keyed by workerId, never by department
// display string, since this codebase already has three other,
// independent department-shaped vocabularies (WorkerContentBuilder's
// verbose department labels like "Executive Leadership", the
// industry-flavored Employee.department, and data/departments.ts's
// document-metadata Department union). Keying by workerId sidesteps all
// three instead of trying to reconcile them.
export const WORKER_IDS = [
  "executive",
  "sales",
  "finance",
  "inventory",
  "hr",
  "customer-support",
  "operations",
  "marketing",
  "procurement",
  "compliance",
] as const;

export type DepartmentWorkerId = (typeof WORKER_IDS)[number];

export const FRIENDLY_DEPARTMENT_LABEL: Record<DepartmentWorkerId, string> = {
  executive: "Executive",
  sales: "Sales",
  finance: "Finance",
  inventory: "Inventory",
  hr: "HR",
  "customer-support": "Customer Support",
  operations: "Operations",
  marketing: "Marketing",
  procurement: "Procurement",
  compliance: "Compliance",
};

export type RoleLevel = "Executive" | "Manager" | "Staff";
export type UserStatus = "Active" | "On Leave" | "Inactive";

export interface AssignedTask {
  id: string;
  title: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
}

export interface AssignedMeeting {
  id: string;
  title: string;
  withWhom: string;
  date: string;
  time: string;
}

export interface AssignedApproval {
  id: string;
  title: string;
  requestedBy: string;
  dueDate: string;
}

export interface EnterpriseUser {
  id: string;
  name: string;
  departmentWorkerId: DepartmentWorkerId;
  role: string;
  roleLevel: RoleLevel;
  region: string;
  managerName: string | null;
  status: UserStatus;
  assignedCustomerIds: string[];
  assignedTasks: AssignedTask[];
  assignedMeetings: AssignedMeeting[];
  assignedApprovals: AssignedApproval[];
}

// A user always has view access to every Digital Worker (see the
// permission model resolved with the user: view access is universal,
// execute access is gated). This function governs EXECUTE access only —
// own department always, Executive Worker additionally for
// Executive/Manager tier or Executive-department members.
export function canAccessWorker(user: EnterpriseUser, workerId: DepartmentWorkerId): boolean {
  if (user.departmentWorkerId === workerId) return true;
  if (workerId !== "executive") return false;
  return user.roleLevel === "Executive" || user.roleLevel === "Manager" || user.departmentWorkerId === "executive";
}
