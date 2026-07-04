import type { ExecutionErrorDetail } from "@/lib/execution/ExecutionError";

export type ExecutionStatus =
  | "Pending"
  | "Running"
  | "Waiting Approval"
  | "Completed"
  | "Failed"
  | "Cancelled"
  | "Skipped";

export interface ExecutionResult {
  output: string;
  success: boolean;
  completedAt: string;
}

export interface ExecutionStep {
  id: string;
  planStepId: string;
  status: ExecutionStatus;
  attempt: number;
  maxAttempts: number;
  result?: ExecutionResult;
  error?: ExecutionErrorDetail;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionTimelineEntry {
  timestamp: string;
  stepId: string;
  status: ExecutionStatus;
  message: string;
}

export interface ExecutionTask {
  id: string;
  planId: string;
  status: ExecutionStatus;
  steps: ExecutionStep[];
  timeline: ExecutionTimelineEntry[];
  createdAt: string;
  completedAt?: string;
}
