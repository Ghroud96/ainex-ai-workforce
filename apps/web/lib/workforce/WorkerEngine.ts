import type { WorkerInstance } from "@/lib/workforce/Worker";
import type { WorkerContext, CompanyProfile } from "@/lib/workforce/WorkerContext";
import { createMockResponse, type WorkerResponse } from "@/lib/workforce/WorkerResponse";
import { WorkerRouter, type RoutingRequest } from "@/lib/workforce/WorkerRouter";
import type { PromptTemplate } from "@/lib/workforce/WorkerTypes";

const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  id: "demo-enterprise",
  name: "Demo Enterprise",
  industry: "General",
};

export interface PrepareContextOptions {
  companyProfile?: CompanyProfile;
  connectedDocuments?: string[];
  businessKpis?: Record<string, string>;
  userRole?: string;
}

// The full run/execute path is mocked end-to-end — no AI provider is called
// anywhere in this file. Every method returns a deterministic result so the
// architecture can be exercised and tested before a real provider exists.
export const WorkerEngine = {
  prepareContext(worker: WorkerInstance, options: PrepareContextOptions = {}): WorkerContext {
    return {
      workerId: worker.id,
      companyProfile: options.companyProfile ?? DEFAULT_COMPANY_PROFILE,
      department: worker.definition.department,
      knowledgeSources: worker.definition.knowledgeSources,
      connectedDocuments: options.connectedDocuments ?? [],
      availableIntegrations: worker.definition.connectedTools,
      businessKpis: options.businessKpis ?? {},
      userRole: options.userRole ?? "Employee",
      conversationHistory: [],
    };
  },

  generatePrompt(worker: WorkerInstance): PromptTemplate {
    return worker.definition.promptTemplate;
  },

  executeCapability(worker: WorkerInstance, capabilityId: string): WorkerResponse {
    const capability = worker.definition.capabilities.find((candidate) => candidate.id === capabilityId);

    if (!capability) {
      return createMockResponse(
        worker.id,
        capabilityId,
        `${worker.name} does not support this capability yet.`,
        "unsupported",
      );
    }

    return createMockResponse(
      worker.id,
      capability.id,
      `[Mock] ${worker.name} executed "${capability.name}". No AI provider is connected — this is a placeholder response.`,
    );
  },

  buildResponse(worker: WorkerInstance, content: string): WorkerResponse {
    return createMockResponse(worker.id, undefined, content);
  },

  execute(request: RoutingRequest): WorkerResponse {
    const decision = WorkerRouter.route(request);

    if (!decision) {
      return createMockResponse("unknown", undefined, "No worker matched this request.", "error");
    }

    if (decision.capability) {
      return this.executeCapability(decision.worker, decision.capability.id);
    }

    return this.buildResponse(decision.worker, `${decision.worker.name} is ready but no capability was specified.`);
  },

  run(request: RoutingRequest): { context: WorkerContext; response: WorkerResponse } | undefined {
    const decision = WorkerRouter.route(request);
    if (!decision) return undefined;

    return {
      context: this.prepareContext(decision.worker),
      response: this.execute(request),
    };
  },
};
