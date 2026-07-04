import type { BusinessPriority, BusinessPriorityLevel } from "@/lib/reasoning/ReasoningTypes";

const LEVEL_SCORES: Record<BusinessPriorityLevel, number> = {
  Critical: 90,
  High: 70,
  Medium: 45,
  Low: 20,
};

export function priorityFromLevel(level: BusinessPriorityLevel): BusinessPriority {
  return { level, score: LEVEL_SCORES[level] };
}

export function comparePriority(a: BusinessPriority, b: BusinessPriority): number {
  return b.score - a.score;
}
