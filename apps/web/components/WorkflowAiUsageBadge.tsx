import type { WorkflowStepIntelligenceDecisionLabel } from "@/lib/workflow/WorkflowTypes";

const TONE: Record<WorkflowStepIntelligenceDecisionLabel, string> = {
  "Intelligence Used": "bg-blue-500/10 text-blue-300",
  "Intelligence Skipped": "bg-green-500/10 text-green-300",
  "Rule-Based Step": "bg-slate-700 text-slate-300",
  "Human Approval Required": "bg-amber-500/10 text-amber-300",
};

export default function WorkflowAiUsageBadge({ label }: { label: WorkflowStepIntelligenceDecisionLabel }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${TONE[label]}`}>{label}</span>;
}
