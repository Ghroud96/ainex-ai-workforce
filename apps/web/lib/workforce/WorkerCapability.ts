import type { Capability } from "@/lib/workforce/WorkerTypes";

export const CAPABILITY_CATALOG = {
  answerQuestions: {
    id: "answer-questions",
    name: "Answer Questions",
    description: "Responds to natural-language business questions using available knowledge.",
    category: "answer",
  },
  generateReports: {
    id: "generate-reports",
    name: "Generate Reports",
    description: "Compiles structured reports from available data sources.",
    category: "report",
  },
  summarizeDocuments: {
    id: "summarize-documents",
    name: "Summarize Documents",
    description: "Produces a concise summary of one or more Knowledge Hub documents.",
    category: "summarize",
  },
  analyzeKpi: {
    id: "analyze-kpi",
    name: "Analyze KPI",
    description: "Interprets KPI trends and flags anomalies.",
    category: "analyze",
  },
  recommendActions: {
    id: "recommend-actions",
    name: "Recommend Actions",
    description: "Suggests a next action based on current context.",
    category: "recommend",
  },
  createWorkflow: {
    id: "create-workflow",
    name: "Create Workflow",
    description: "Defines a new Workflow Automation trigger.",
    category: "workflow",
  },
  triggerWorkflow: {
    id: "trigger-workflow",
    name: "Trigger Workflow",
    description: "Runs an existing Workflow Automation from a Decision.",
    category: "workflow",
  },
  searchKnowledge: {
    id: "search-knowledge",
    name: "Search Knowledge",
    description: "Queries the Knowledge Hub for relevant context.",
    category: "search",
  },
  triggerIntegration: {
    id: "trigger-integration",
    name: "Trigger Integration",
    description: "Invokes a connected Enterprise Integration.",
    category: "integration",
  },
} as const satisfies Record<string, Capability>;

export type CapabilityKey = keyof typeof CAPABILITY_CATALOG;

export function getCapability(key: CapabilityKey): Capability {
  return CAPABILITY_CATALOG[key];
}

export function listCapabilities(keys: CapabilityKey[]): Capability[] {
  return keys.map(getCapability);
}
