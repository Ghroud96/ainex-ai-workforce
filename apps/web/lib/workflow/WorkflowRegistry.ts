import { workflows as seedWorkflows } from "@/data/workflows";
import type { Workflow } from "@/lib/workflow/WorkflowTypes";

// Mirrors WorkerRegistry (lib/workforce/WorkerRegistry.ts): a plain
// in-memory registry seeded from mock data, with the same register/
// getAll/getById shape, so a future phase can register a real,
// customer-authored Workflow the same way it would register a real
// Digital Worker — no interface change.
class WorkflowRegistryImpl {
  private workflowsById = new Map<string, Workflow>();

  constructor(initial: Workflow[]) {
    this.registerAll(initial);
  }

  register(workflow: Workflow): void {
    this.workflowsById.set(workflow.id, workflow);
  }

  registerAll(workflows: Workflow[]): void {
    for (const workflow of workflows) {
      this.register(workflow);
    }
  }

  getAll(): Workflow[] {
    return Array.from(this.workflowsById.values());
  }

  getById(id: string): Workflow | undefined {
    return this.workflowsById.get(id);
  }

  getByDepartment(department: string): Workflow[] {
    return this.getAll().filter((workflow) => workflow.department === department);
  }

  getByOwnerWorker(workerId: string): Workflow[] {
    return this.getAll().filter((workflow) => workflow.ownerWorkerId === workerId);
  }

  getScheduled(): Workflow[] {
    return this.getAll().filter((workflow) => workflow.trigger.type === "Scheduled");
  }
}

export const WorkflowRegistry = new WorkflowRegistryImpl(seedWorkflows);
