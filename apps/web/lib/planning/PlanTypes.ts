import type { BusinessPriority } from "@/lib/reasoning/ReasoningTypes";

export type PlanStepType = "worker-task" | "workflow-trigger" | "human-approval" | "executive-summary";

export type PlanScheduleType = "immediate" | "scheduled" | "recurring";

// Architecture only — no scheduler exists yet. Every step today is
// "immediate"; the shape exists so a future phase can add real
// scheduled/recurring execution without changing PlanStep.
export interface PlanSchedule {
  type: PlanScheduleType;
  runAt?: string;
  cronExpression?: string;
}

export interface PlanStep {
  id: string;
  order: number;
  type: PlanStepType;
  title: string;
  description: string;
  workerId?: string;
  capabilityId?: string;
  requiresApproval: boolean;
  priority: BusinessPriority;
  schedule: PlanSchedule;
}

export interface Plan {
  id: string;
  goal: string;
  originWorkerId: string;
  collaboratingWorkerIds: string[];
  steps: PlanStep[];
  requiresWorkflow: boolean;
  requiresHumanApproval: boolean;
  createdAt: string;
}

export const IMMEDIATE_SCHEDULE: PlanSchedule = { type: "immediate" };
