import { priorityFromLevel } from "@/lib/reasoning/BusinessPriority";
import type { BusinessPriorityLevel, ReasoningFinding } from "@/lib/reasoning/ReasoningTypes";

export type DecisionOutcome<T, R> = DecisionNode<T, R> | R;

export interface DecisionNode<T, R> {
  question: string;
  evaluate: (input: T) => boolean;
  onTrue: DecisionOutcome<T, R>;
  onFalse: DecisionOutcome<T, R>;
}

// A generic, reusable decision tree — not specific to priority. Any
// future business decision (e.g. "should this be escalated?") can build
// its own tree of this shape and call evaluateDecisionTree with it.
export function evaluateDecisionTree<T, R>(node: DecisionNode<T, R>, input: T): R {
  const outcome = node.evaluate(input) ? node.onTrue : node.onFalse;
  return isDecisionNode(outcome) ? evaluateDecisionTree(outcome, input) : outcome;
}

function isDecisionNode<T, R>(outcome: DecisionOutcome<T, R>): outcome is DecisionNode<T, R> {
  return typeof outcome === "object" && outcome !== null && "evaluate" in outcome;
}

interface OverallPriorityInput {
  findings: ReasoningFinding[];
}

function hasPriority(level: BusinessPriorityLevel) {
  return (input: OverallPriorityInput) => input.findings.some((finding) => finding.priority.level === level);
}

const overallPriorityTree: DecisionNode<OverallPriorityInput, BusinessPriorityLevel> = {
  question: "Does any finding have Critical priority?",
  evaluate: hasPriority("Critical"),
  onTrue: "Critical",
  onFalse: {
    question: "Does any finding have High priority?",
    evaluate: hasPriority("High"),
    onTrue: "High",
    onFalse: {
      question: "Does any finding have Medium priority?",
      evaluate: hasPriority("Medium"),
      onTrue: "Medium",
      onFalse: "Low",
    },
  },
};

export function deriveOverallPriority(findings: ReasoningFinding[]) {
  const level = evaluateDecisionTree(overallPriorityTree, { findings });
  return priorityFromLevel(level);
}
