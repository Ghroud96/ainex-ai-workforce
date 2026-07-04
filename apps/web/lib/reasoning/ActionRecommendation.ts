import type { ActionItem, ReasoningFinding } from "@/lib/reasoning/ReasoningTypes";

let actionCounter = 0;
function nextActionId(): string {
  actionCounter += 1;
  return `action-${actionCounter}`;
}

// Turns risk findings into concrete action items. Opportunities and
// anomalies are informational; only risks currently generate an action.
export function buildActionItems(findings: ReasoningFinding[]): ActionItem[] {
  return findings
    .filter((finding) => finding.category === "risk")
    .map((finding) => ({
      id: nextActionId(),
      title: `Address: ${finding.title}`,
      description: finding.description,
      priority: finding.priority,
    }));
}
