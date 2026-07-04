import type { WorkerStatusValue } from "@/lib/workforce/WorkerTypes";

export interface WorkerHealth {
  status: WorkerStatusValue;
  operational: boolean;
  lastCheckedAt: string;
  notes: string;
}

const HEALTH_NOTES: Record<WorkerStatusValue, string> = {
  Available: "Running on mock data — no live AI provider connected.",
  "In Development": "Architecture defined; not yet running live capabilities.",
  "Coming Soon": "Registered, but not yet enabled for active use.",
  Offline: "Registered but currently disabled.",
};

export function computeWorkerHealth(status: WorkerStatusValue): WorkerHealth {
  return {
    status,
    operational: status === "Available",
    lastCheckedAt: new Date().toISOString(),
    notes: HEALTH_NOTES[status],
  };
}
