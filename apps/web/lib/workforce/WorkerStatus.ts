import type { WorkerStatusValue } from "@/lib/workforce/WorkerTypes";

export interface WorkerHealth {
  status: WorkerStatusValue;
  operational: boolean;
  lastCheckedAt: string;
  notes: string;
}

const HEALTH_NOTES: Record<WorkerStatusValue, string> = {
  Available: "Operating normally.",
  "In Development": "Still being built — not yet available.",
  "Coming Soon": "Not yet enabled for active use.",
  Offline: "Currently disabled.",
};

export function computeWorkerHealth(status: WorkerStatusValue): WorkerHealth {
  return {
    status,
    operational: status === "Available",
    lastCheckedAt: new Date().toISOString(),
    notes: HEALTH_NOTES[status],
  };
}
