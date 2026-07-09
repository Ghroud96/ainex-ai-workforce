import type { Action } from "@/lib/action/ActionTypes";

// Mock Action Library — every entry is a real, typed Action definition,
// not a live integration (see CLAUDE.md — never fake data as if live;
// this is clearly mock and documented as such). workerIds match the
// slugs in data/workers.ts. Every ActionType this phase introduces
// appears at least once.
export const actions: Action[] = [
  {
    id: "send-invoice-reminder-email",
    type: "Send Email",
    name: "Send Overdue Invoice Reminder",
    description: "Emails a customer's billing contact a reminder for an overdue invoice.",
    requiresApproval: true,
    workerIds: ["finance"],
  },
  {
    id: "send-lead-followup-whatsapp",
    type: "Send WhatsApp",
    name: "Send Lead Follow-Up Message",
    description: "Sends a WhatsApp follow-up message to a stalled sales lead.",
    requiresApproval: false,
    workerIds: ["sales"],
  },
  {
    id: "create-reorder-task",
    type: "Create Task",
    name: "Create Reorder Task",
    description: "Creates a purchasing task for a SKU that dropped below its reorder threshold.",
    requiresApproval: false,
    workerIds: ["inventory", "procurement"],
  },
  {
    id: "generate-weekly-sales-report",
    type: "Generate Report",
    name: "Generate Weekly Sales Report",
    description: "Compiles this week's pipeline movement into a report.",
    requiresApproval: false,
    workerIds: ["sales", "executive"],
  },
  {
    id: "trigger-low-stock-reorder-workflow",
    type: "Trigger Workflow",
    name: "Trigger Low Stock Reorder Workflow",
    description: "Runs the Low Stock Reorder Alert workflow for a flagged SKU.",
    requiresApproval: true,
    workerIds: ["inventory"],
  },
  {
    id: "trigger-executive-digest-workflow",
    type: "Trigger Workflow",
    name: "Trigger Weekly Executive Digest",
    description: "Runs the Weekly Executive Digest workflow on demand instead of waiting for its schedule.",
    requiresApproval: false,
    workerIds: ["executive"],
  },
  {
    id: "create-onboarding-reminder",
    type: "Create Reminder",
    name: "Create Onboarding Reminder",
    description: "Creates a reminder for an upcoming new-hire onboarding milestone.",
    requiresApproval: false,
    workerIds: ["hr"],
  },
  {
    id: "update-crm-opportunity-stage",
    type: "Update CRM",
    name: "Update CRM Opportunity Stage",
    description: "Updates a sales opportunity's stage after a follow-up attempt.",
    requiresApproval: false,
    workerIds: ["sales"],
  },
  {
    id: "create-customer-invoice",
    type: "Create Invoice",
    name: "Create Customer Invoice",
    description: "Creates a new invoice for a completed order.",
    requiresApproval: true,
    workerIds: ["finance"],
  },
  {
    id: "notify-manager-inventory-risk",
    type: "Notify Manager",
    name: "Notify Manager of Inventory Risk",
    description: "Notifies the responsible manager when a SKU is at risk of stockout.",
    requiresApproval: false,
    workerIds: ["inventory", "operations"],
  },
  {
    id: "request-policy-change-approval",
    type: "Request Approval",
    name: "Request Approval for Policy Change",
    description: "Requests manager approval before a compliance policy update is published.",
    requiresApproval: false,
    workerIds: ["compliance"],
  },
  {
    id: "notify-manager-support-escalation",
    type: "Notify Manager",
    name: "Notify Manager of Support Escalation",
    description: "Notifies the responsible manager when a support ticket breaches its SLA.",
    requiresApproval: false,
    workerIds: ["customer-support"],
  },
  {
    id: "generate-campaign-performance-report",
    type: "Generate Report",
    name: "Generate Campaign Performance Report",
    description: "Compiles campaign reach, engagement, and conversion metrics into a report.",
    requiresApproval: false,
    workerIds: ["marketing"],
  },
];

export function getActionsForWorker(workerId: string): Action[] {
  return actions.filter((action) => action.workerIds.includes(workerId));
}
