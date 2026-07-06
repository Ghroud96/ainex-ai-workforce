import type { PersonaId } from "./WorkerAnalysisService";

export interface AnalysisGroup {
  title: string;
  sectionKeys: string[];
}

export interface PersonaGroupingConfig {
  leadSectionKey?: string; // rendered above the groups as shared context, not inside any group
  groups: AnalysisGroup[];
}

// Presentation-only regrouping of WorkerAnalysisService's existing
// sections into named business-action panels — the underlying computation
// in WorkerAnalysisService.ts is untouched, this only changes how its
// result is laid out. Some persona example action names a stakeholder
// might expect (e.g. HR "Resume Analysis") have no backing field anywhere
// in this app's data model, so groups below use the closest REAL grouping
// of what each persona actually computes today rather than inventing data.
// "sales" is deliberately absent — the deal workflow's 8 touchpoints
// already give it real, named business actions via STAGE_CONFIG.
export const WORKER_ANALYSIS_GROUPING: Partial<Record<PersonaId, PersonaGroupingConfig>> = {
  executive: {
    leadSectionKey: "executiveSummary",
    groups: [
      { title: "Business Health Review", sectionKeys: ["businessRisks", "opportunities"] },
      { title: "Recommended Decisions", sectionKeys: ["recommendedDecisions"] },
    ],
  },
  finance: {
    leadSectionKey: "cashFlowSummary",
    groups: [
      { title: "Invoice Analysis", sectionKeys: ["overdueInvoices"] },
      { title: "Payment Risk Analysis", sectionKeys: ["financialRisks", "costConcerns"] },
      { title: "Credit Recommendation", sectionKeys: ["recommendedActions"] },
    ],
  },
  inventory: {
    leadSectionKey: "inventoryForecast",
    groups: [
      { title: "Inventory Risk Analysis", sectionKeys: ["lowStockItems", "warehouseIssues"] },
      { title: "Reorder Recommendation", sectionKeys: ["reorderSuggestions"] },
      { title: "Supplier Comparison", sectionKeys: ["supplierRisks"] },
    ],
  },
  hr: {
    groups: [
      { title: "Leave & Staffing Review", sectionKeys: ["leaveSummary", "staffRisks"] },
      { title: "Hiring Needs", sectionKeys: ["hiringNeeds"] },
      { title: "Training Recommendation", sectionKeys: ["trainingNeeds", "recommendedActions"] },
    ],
  },
  "executive-assistant": {
    groups: [
      { title: "Today's Priorities", sectionKeys: ["todaysPriorities", "upcomingMeetings"] },
      { title: "Tasks & Approvals", sectionKeys: ["pendingTasks", "approvalReminders"] },
      { title: "Follow-ups & Recommendations", sectionKeys: ["importantFollowUps", "personalRecommendations"] },
    ],
  },
};
