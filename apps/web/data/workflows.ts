import type { Workflow } from "@/lib/workflow/WorkflowTypes";

// Mock Workflow Library — the same role data/documents.ts and
// data/workers.ts play for their layers: real typed data, no live n8n
// connection. Departments match apps/web/data/workers.ts exactly, so
// WorkflowService.recommendedForWorker() can scope by department.
export const workflows: Workflow[] = [
  {
    id: "lead-follow-up",
    name: "Lead Follow-Up",
    description: "Notifies the Sales Worker and messages a lead that has gone quiet for 7+ days.",
    department: "Sales",
    ownerWorkerId: "sales",
    trigger: { type: "Worker Recommended", description: "Sales Worker flags a stalled lead." },
    steps: [
      { id: "lead-follow-up-1", order: 1, name: "Detect stalled lead", description: "Sales Worker identifies a lead with no activity for 7+ days.", actionType: "Notify Manager", intelligencePolicy: { mode: "rule-based", reason: "Lead inactivity is detected from structured CRM dates.", estimatedSkippedCostUsd: 0.012 } },
      { id: "lead-follow-up-2", order: 2, name: "Send follow-up message", description: "Sends a WhatsApp follow-up to the lead.", actionType: "Send WhatsApp", intelligencePolicy: { mode: "intelligence-optional", reason: "Follow-up copy can be personalized, but V1 uses an approved template by default.", estimatedCostUsd: 0.01 } },
      { id: "lead-follow-up-3", order: 3, name: "Update CRM", description: "Logs the follow-up attempt against the opportunity.", actionType: "Update CRM", intelligencePolicy: { mode: "rule-based", reason: "CRM updates use deterministic field mappings.", estimatedSkippedCostUsd: 0.012 } },
    ],
    status: "Active",
    requiresApproval: false,
    createdAt: "2026-01-12T09:00:00.000Z",
    updatedAt: "2026-05-02T09:00:00.000Z",
  },
  {
    id: "invoice-reminders",
    name: "Invoice Reminders",
    description: "Sends a payment reminder for invoices the Finance Worker flags as overdue.",
    department: "Finance",
    ownerWorkerId: "finance",
    trigger: { type: "Worker Recommended", description: "Finance Worker flags an overdue invoice." },
    steps: [
      { id: "invoice-reminders-1", order: 1, name: "Identify overdue invoice", description: "Finance Worker cross-references the Outstanding Invoice Register.", actionType: "Generate Report", intelligencePolicy: { mode: "rule-based", reason: "Overdue invoices are identified from due dates and payment status.", estimatedSkippedCostUsd: 0.018 } },
      { id: "invoice-reminders-2", order: 2, name: "Send reminder email", description: "Emails the customer's billing contact a payment reminder.", actionType: "Send Email", intelligencePolicy: { mode: "intelligence-optional", reason: "Reminder copy can use Intelligence, but V1 uses an approved finance template.", estimatedCostUsd: 0.01 } },
    ],
    status: "Active",
    requiresApproval: true,
    createdAt: "2026-01-20T09:00:00.000Z",
    updatedAt: "2026-06-18T09:00:00.000Z",
  },
  {
    id: "low-stock-reorder",
    name: "Low Stock Reorder Alert",
    description: "Triggers a reorder task when a SKU drops below its inventory threshold.",
    department: "Supply Chain",
    ownerWorkerId: "inventory",
    trigger: { type: "Event Based", description: "Inventory level crosses the reorder threshold.", eventName: "inventory.threshold_breached" },
    steps: [
      { id: "low-stock-reorder-1", order: 1, name: "Detect threshold breach", description: "Inventory Worker detects a SKU below its reorder point.", actionType: "Notify Manager", intelligencePolicy: { mode: "rule-based", reason: "Inventory thresholds are compared against structured stock levels.", estimatedSkippedCostUsd: 0.012 } },
      { id: "low-stock-reorder-2", order: 2, name: "Create reorder task", description: "Creates a purchasing task for the affected SKU.", actionType: "Create Task", intelligencePolicy: { mode: "rule-based", reason: "Reorder tasks use known SKU and threshold data.", estimatedSkippedCostUsd: 0.012 } },
      { id: "low-stock-reorder-3", order: 3, name: "Request approval", description: "Purchasing above a threshold requires manager approval.", actionType: "Request Approval", intelligencePolicy: { mode: "rule-based", reason: "Approval routing is a deterministic control step.", estimatedSkippedCostUsd: 0.012 } },
    ],
    status: "Active",
    requiresApproval: true,
    createdAt: "2026-02-03T09:00:00.000Z",
    updatedAt: "2026-06-25T09:00:00.000Z",
  },
  {
    id: "weekly-executive-digest",
    name: "Weekly Executive Digest",
    description: "Compiles KPI movement and risk signals from every department into a Monday morning brief.",
    department: "Executive Leadership",
    ownerWorkerId: "executive",
    trigger: { type: "Scheduled", description: "Runs every Monday at 07:00.", cronExpression: "0 7 * * 1" },
    steps: [
      { id: "weekly-executive-digest-1", order: 1, name: "Aggregate department signals", description: "Executive Worker pulls the latest reasoning output from every department.", actionType: "Generate Report", intelligencePolicy: { mode: "intelligence-required", reason: "Executive synthesis requires narrative reasoning across multiple department signals.", estimatedCostUsd: 0.018 } },
      { id: "weekly-executive-digest-2", order: 2, name: "Send digest", description: "Emails the compiled digest to leadership.", actionType: "Send Email", intelligencePolicy: { mode: "rule-based", reason: "Sending the prepared digest is deterministic once content exists.", estimatedSkippedCostUsd: 0.01 } },
    ],
    status: "Active",
    requiresApproval: false,
    createdAt: "2026-01-05T09:00:00.000Z",
    updatedAt: "2026-06-29T09:00:00.000Z",
  },
  {
    id: "onboarding-kickoff",
    name: "New Hire Onboarding Kickoff",
    description: "Creates the first-week onboarding checklist and reminders for a new hire.",
    department: "Human Resources",
    ownerWorkerId: "hr",
    trigger: { type: "Manual", description: "HR triggers this after an offer is accepted." },
    steps: [
      { id: "onboarding-kickoff-1", order: 1, name: "Create onboarding tasks", description: "Creates the standard first-week checklist.", actionType: "Create Task", intelligencePolicy: { mode: "rule-based", reason: "The onboarding checklist is a controlled company template.", estimatedSkippedCostUsd: 0.012 } },
      { id: "onboarding-kickoff-2", order: 2, name: "Schedule reminders", description: "Creates reminders for each onboarding milestone.", actionType: "Create Reminder", intelligencePolicy: { mode: "rule-based", reason: "Reminder dates come from the onboarding template.", estimatedSkippedCostUsd: 0.012 } },
    ],
    status: "Draft",
    requiresApproval: false,
    createdAt: "2026-03-11T09:00:00.000Z",
    updatedAt: "2026-03-11T09:00:00.000Z",
  },
  {
    id: "compliance-policy-review",
    name: "Compliance Policy Review Reminder",
    description: "Reminds policy owners to review a compliance policy before its annual expiry.",
    department: "Legal & Compliance",
    ownerWorkerId: "compliance",
    trigger: { type: "Scheduled", description: "Runs monthly, checking for policies due within 30 days.", cronExpression: "0 8 1 * *" },
    steps: [
      { id: "compliance-policy-review-1", order: 1, name: "Check policy expiry dates", description: "Compliance Worker scans the Knowledge Hub for policies nearing review.", actionType: "Generate Report", intelligencePolicy: { mode: "rule-based", reason: "Policy review dates are compared against stored expiry metadata.", estimatedSkippedCostUsd: 0.018 } },
      { id: "compliance-policy-review-2", order: 2, name: "Notify policy owner", description: "Notifies the responsible manager.", actionType: "Notify Manager", intelligencePolicy: { mode: "rule-based", reason: "Owner notification uses known policy ownership data.", estimatedSkippedCostUsd: 0.012 } },
    ],
    status: "Paused",
    requiresApproval: false,
    createdAt: "2026-02-14T09:00:00.000Z",
    updatedAt: "2026-04-30T09:00:00.000Z",
  },
];

export function getWorkflowById(id: string): Workflow | undefined {
  return workflows.find((workflow) => workflow.id === id);
}

export function getWorkflowsByDepartment(department: string): Workflow[] {
  return workflows.filter((workflow) => workflow.department === department);
}
