export type BusinessPriorityLevel = "Critical" | "High" | "Medium" | "Low";

export interface BusinessPriority {
  level: BusinessPriorityLevel;
  score: number;
}

export type ConfidenceLabel = "High" | "Medium" | "Low";

export interface ConfidenceScore {
  value: number;
  label: ConfidenceLabel;
  basis: string;
}

export type FindingCategory = "risk" | "opportunity" | "anomaly";

export interface ReasoningFinding {
  id: string;
  category: FindingCategory;
  title: string;
  description: string;
  priority: BusinessPriority;
  relatedDocumentIds: string[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: BusinessPriority;
}

export interface ExecutiveSummary {
  headline: string;
  narrative: string;
  keyFindingIds: string[];
}

export interface ReasoningResult {
  workerId: string;
  confidence: ConfidenceScore;
  overallPriority: BusinessPriority;
  findings: ReasoningFinding[];
  actions: ActionItem[];
  followUps: string[];
  executiveSummary: ExecutiveSummary;
  generatedAt: string;
}
