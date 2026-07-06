import { getWorkerBySlug, type DigitalWorker } from "@/data/workers";
import type { WorkerInstance } from "@/lib/workforce/Worker";
import { WorkerRegistry } from "@/lib/workforce/WorkerRegistry";
import { computeWorkerHealth, type WorkerHealth } from "@/lib/workforce/WorkerStatus";
import type { WorkerStatusValue } from "@/lib/workforce/WorkerTypes";

function toLegacyStatus(status: WorkerStatusValue): DigitalWorker["status"] {
  return status === "Offline" ? "Coming Soon" : status;
}

// Fallback for a worker registered directly into the engine with no
// matching Sprint 2 record — proves the registry can host a worker beyond
// the original ten without any UI change.
function synthesizeDigitalWorker(worker: WorkerInstance): DigitalWorker {
  const definition = worker.definition;

  return {
    slug: definition.id,
    name: definition.name,
    department: definition.department,
    businessFunction:
      definition.capabilities
        .slice(0, 2)
        .map((capability) => capability.name)
        .join(" · ") || definition.department,
    shortDescription: definition.description,
    businessDescription: definition.description,
    businessValue: definition.businessValue,
    purpose: definition.purpose,
    successMetric: "Success metric not yet defined for this worker.",
    status: toLegacyStatus(definition.status),
    knowledgeSources: definition.knowledgeSources,
    workflows: definition.availableActions.map((action) => ({
      name: action.name,
      description: action.description,
    })),
    tools: definition.connectedTools,
    capabilities: [],
  };
}

export interface WorkforceStats {
  total: number;
  available: number;
  inDevelopment: number;
  offline: number;
  connectedKnowledge: number;
  connectedIntegrations: number;
  operational: number;
}

export const WorkforceService = {
  getAll(): WorkerInstance[] {
    return WorkerRegistry.getAll();
  },

  getById(id: string): WorkerInstance | undefined {
    return WorkerRegistry.getById(id);
  },

  toCardData(worker: WorkerInstance): DigitalWorker {
    return getWorkerBySlug(worker.id) ?? synthesizeDigitalWorker(worker);
  },

  getHealth(worker: WorkerInstance): WorkerHealth {
    return computeWorkerHealth(worker.definition.status);
  },

  getStats(): WorkforceStats {
    const all = WorkerRegistry.getAll();

    return {
      total: all.length,
      available: all.filter((worker) => worker.definition.status === "Available").length,
      inDevelopment: all.filter((worker) => worker.definition.status === "In Development").length,
      offline: all.filter((worker) => worker.definition.status === "Offline").length,
      connectedKnowledge: new Set(all.flatMap((worker) => worker.definition.knowledgeSources)).size,
      connectedIntegrations: new Set(all.flatMap((worker) => worker.definition.connectedTools)).size,
      operational: all.filter((worker) => worker.isAvailable()).length,
    };
  },
};
