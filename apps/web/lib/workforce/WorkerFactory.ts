import { workers as legacyWorkers, type DigitalWorker, type WorkerCapability as LegacyCapability } from "@/data/workers";
import { WorkerInstance } from "@/lib/workforce/Worker";
import { getCapability, type CapabilityKey } from "@/lib/workforce/WorkerCapability";
import { buildPromptTemplate } from "@/lib/workforce/WorkerPrompt";
import type { Capability, Worker, WorkerAction } from "@/lib/workforce/WorkerTypes";

const LEGACY_CAPABILITY_MAP: Record<LegacyCapability, CapabilityKey> = {
  "Can Answer Questions": "answerQuestions",
  "Can Generate Reports": "generateReports",
  "Can Trigger Workflows": "triggerWorkflow",
  "Can Recommend Actions": "recommendActions",
  "Can Monitor KPIs": "analyzeKpi",
};

function mapCapabilities(legacy: LegacyCapability[]): Capability[] {
  return legacy.map((capability) => getCapability(LEGACY_CAPABILITY_MAP[capability]));
}

function mapAvailableActions(legacy: DigitalWorker): WorkerAction[] {
  return legacy.workflows.map((workflow, index) => ({
    id: `${legacy.slug}-action-${index}`,
    name: `Trigger: ${workflow.name}`,
    description: workflow.description,
  }));
}

export function createWorkerFromLegacy(legacy: DigitalWorker): WorkerInstance {
  const definition: Worker = {
    id: legacy.slug,
    name: legacy.name,
    department: legacy.department,
    description: legacy.businessDescription,
    purpose: legacy.purpose,
    businessValue: legacy.businessValue,
    status: legacy.status,
    knowledgeSources: legacy.knowledgeSources,
    capabilities: mapCapabilities(legacy.capabilities),
    connectedTools: legacy.tools,
    availableActions: mapAvailableActions(legacy),
    promptTemplate: buildPromptTemplate({
      id: legacy.slug,
      name: legacy.name,
      purpose: legacy.purpose,
      businessValue: legacy.businessValue,
      knowledgeSources: legacy.knowledgeSources,
    }),
  };

  return new WorkerInstance(definition);
}

export function buildWorkforceRoster(): WorkerInstance[] {
  return legacyWorkers.map(createWorkerFromLegacy);
}
