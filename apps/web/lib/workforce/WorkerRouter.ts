import { WorkerRegistry } from "@/lib/workforce/WorkerRegistry";
import type { WorkerInstance } from "@/lib/workforce/Worker";
import type { Capability, PromptTemplate } from "@/lib/workforce/WorkerTypes";

export interface RoutingRequest {
  workerId?: string;
  department?: string;
  capabilityId?: string;
}

export interface RoutingDecision {
  worker: WorkerInstance;
  capability?: Capability;
  promptTemplate: PromptTemplate;
  knowledgeContext: string[];
}

// Deterministic, rule-based routing — no AI, no LLM. Decides which worker,
// which capability, which prompt template, and which knowledge context to
// use for a given request.
export const WorkerRouter = {
  route(request: RoutingRequest): RoutingDecision | undefined {
    const worker = request.workerId
      ? WorkerRegistry.getById(request.workerId)
      : request.department
        ? WorkerRegistry.getByDepartment(request.department)[0]
        : undefined;

    if (!worker) return undefined;

    const capability = request.capabilityId
      ? worker.definition.capabilities.find((candidate) => candidate.id === request.capabilityId)
      : worker.definition.capabilities[0];

    return {
      worker,
      capability,
      promptTemplate: worker.definition.promptTemplate,
      knowledgeContext: worker.definition.knowledgeSources,
    };
  },
};
