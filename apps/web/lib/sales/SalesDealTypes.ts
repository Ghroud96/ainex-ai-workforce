// One stateful business object — a single customer opportunity moving
// through a fixed pipeline — not a capability catalog. This is the
// connective tissue for the Enterprise Demo V1 story: Sales creates and
// advances a deal, a Sales Manager approves it, Finance reviews it, and
// the Executive Dashboard/Executive Assistant react to it automatically.
export type DealStage =
  | "follow-up-needed"
  | "customer-analyzed"
  | "meeting-planned"
  | "meeting-completed"
  | "meeting-summarized"
  | "follow-up-drafted"
  | "quotation-drafted"
  | "order-drafted"
  | "pending-manager-approval"
  | "revision-requested"
  | "pending-finance-review"
  | "confirmed"
  | "rejected";

export type DealTouchpointId =
  | "customer-analysis"
  | "meeting-brief"
  | "meeting-summary"
  | "generate-follow-up"
  | "quotation-draft"
  | "sales-order-draft"
  | "manager-review"
  | "finance-review";

export interface DealConfidence {
  value: number;
  label: "Low" | "Medium" | "High";
}

export interface DealAiResult {
  touchpointId: DealTouchpointId;
  aiAnalysis: string;
  businessRecommendation: string;
  estimatedBusinessImpact: string;
  confidence: DealConfidence;
  suggestedNextAction: string;
  knowledgeSourcesUsed: string[];
  modelUsed: string;
  source: "Demo Mode" | "Live AI";
  generationTimeMs: number;
}

export interface DealHistoryEntry {
  stage: DealStage;
  at: string;
  note: string;
}

export interface SalesDeal {
  id: string;
  customerId: string;
  ownerUserId: string;
  stage: DealStage;
  estimatedValue: number;
  lastInteraction: string;
  history: DealHistoryEntry[];
  aiResults: Partial<Record<DealTouchpointId, DealAiResult>>;
}

export interface StageDefinition {
  label: string;
  responsibleRole: "Sales Rep" | "Sales Manager" | "Finance" | "Complete";
  // Present when this stage has an associated "Run AI" action. Running it
  // only records an aiResults[touchpointId] entry and never advances the
  // stage by itself — AI is optional and the result must be reviewable
  // before the deal moves on ("the salesperson always reviews the result
  // before continuing").
  touchpointId?: DealTouchpointId;
  // Present on every stage that can move forward with a plain "Next Step"
  // click (available whether or not Run AI was used first — AI assists,
  // it never gates progress). Absent at the two approval gates, where the
  // stage instead advances only via the Manager/Finance decision actions.
  nextStage?: DealStage;
  nextStepLabel?: string;
}

export const STAGE_CONFIG: Record<DealStage, StageDefinition> = {
  "follow-up-needed": {
    label: "Follow-up Needed",
    responsibleRole: "Sales Rep",
    touchpointId: "customer-analysis",
    nextStage: "customer-analyzed",
    nextStepLabel: "Mark Customer Analyzed",
  },
  "customer-analyzed": {
    label: "Customer Analyzed",
    responsibleRole: "Sales Rep",
    touchpointId: "meeting-brief",
    nextStage: "meeting-planned",
    nextStepLabel: "Mark Meeting Planned",
  },
  "meeting-planned": {
    label: "Meeting Planned",
    responsibleRole: "Sales Rep",
    nextStage: "meeting-completed",
    nextStepLabel: "Mark Meeting Completed",
  },
  "meeting-completed": {
    label: "Meeting Completed",
    responsibleRole: "Sales Rep",
    touchpointId: "meeting-summary",
    nextStage: "meeting-summarized",
    nextStepLabel: "Mark Meeting Summarized",
  },
  "meeting-summarized": {
    label: "Meeting Summarized",
    responsibleRole: "Sales Rep",
    touchpointId: "generate-follow-up",
    nextStage: "follow-up-drafted",
    nextStepLabel: "Mark Follow-up Drafted",
  },
  "follow-up-drafted": {
    label: "Follow-up Drafted",
    responsibleRole: "Sales Rep",
    touchpointId: "quotation-draft",
    nextStage: "quotation-drafted",
    nextStepLabel: "Mark Quotation Drafted",
  },
  "quotation-drafted": {
    label: "Quotation Drafted",
    responsibleRole: "Sales Rep",
    touchpointId: "sales-order-draft",
    nextStage: "order-drafted",
    nextStepLabel: "Mark Order Drafted",
  },
  "order-drafted": {
    label: "Sales Order Drafted",
    responsibleRole: "Sales Rep",
    nextStage: "pending-manager-approval",
    nextStepLabel: "Submit for Approval",
  },
  "pending-manager-approval": {
    label: "Pending Manager Approval",
    responsibleRole: "Sales Manager",
    touchpointId: "manager-review",
  },
  "revision-requested": {
    label: "Revision Requested",
    responsibleRole: "Sales Rep",
    nextStage: "order-drafted",
    nextStepLabel: "Revise & Resubmit",
  },
  "pending-finance-review": {
    label: "Pending Finance Review",
    responsibleRole: "Finance",
    touchpointId: "finance-review",
  },
  confirmed: { label: "Confirmed", responsibleRole: "Complete" },
  rejected: { label: "Rejected", responsibleRole: "Complete" },
};
