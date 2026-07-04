export type WorkerStatusValue = "Available" | "In Development" | "Coming Soon" | "Offline";

export type CapabilityCategory =
  | "answer"
  | "report"
  | "summarize"
  | "analyze"
  | "recommend"
  | "workflow"
  | "search"
  | "integration";

export interface Capability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;
}

export interface WorkerAction {
  id: string;
  name: string;
  description: string;
}

export interface PromptTemplate {
  workerId: string;
  systemPrompt: string;
  instructions: string[];
}

export interface Worker {
  id: string;
  name: string;
  department: string;
  description: string;
  purpose: string;
  businessValue: string;
  status: WorkerStatusValue;
  knowledgeSources: string[];
  capabilities: Capability[];
  connectedTools: string[];
  availableActions: WorkerAction[];
  promptTemplate: PromptTemplate;
}
