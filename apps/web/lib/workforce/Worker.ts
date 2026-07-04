import type { Worker as WorkerDefinition } from "@/lib/workforce/WorkerTypes";

export class WorkerInstance {
  constructor(private readonly data: WorkerDefinition) {}

  get id(): string {
    return this.data.id;
  }

  get name(): string {
    return this.data.name;
  }

  get status(): WorkerDefinition["status"] {
    return this.data.status;
  }

  get definition(): WorkerDefinition {
    return this.data;
  }

  isAvailable(): boolean {
    return this.data.status === "Available";
  }

  hasCapability(capabilityId: string): boolean {
    return this.data.capabilities.some((capability) => capability.id === capabilityId);
  }

  hasKnowledgeSource(source: string): boolean {
    return this.data.knowledgeSources.includes(source);
  }
}
