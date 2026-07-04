import { comparePriority } from "@/lib/reasoning/BusinessPriority";
import type { PlanStep } from "@/lib/planning/PlanTypes";

// Reorders steps by business priority (reusing B6's comparator, not a new
// scoring model) and reassigns sequential order.
export function prioritizeSteps(steps: PlanStep[]): PlanStep[] {
  return [...steps]
    .sort((a, b) => comparePriority(a.priority, b.priority))
    .map((step, index) => ({ ...step, order: index }));
}
