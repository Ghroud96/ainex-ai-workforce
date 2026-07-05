import { buildWorkforceRoster } from "@/lib/workforce/WorkerFactory";
import type { WorkerInstance } from "@/lib/workforce/Worker";

class WorkerRegistryImpl {
  private workers = new Map<string, WorkerInstance>();

  constructor(initialWorkers: WorkerInstance[]) {
    this.registerAll(initialWorkers);
  }

  register(worker: WorkerInstance): void {
    this.workers.set(worker.id, worker);
  }

  registerAll(workers: WorkerInstance[]): void {
    for (const worker of workers) {
      this.register(worker);
    }
  }

  // Swaps the entire roster in one call — used when the active company
  // profile changes (lib/enterprise/CompanyProfileStore.ts) so every
  // consumer of this registry (WorkforceService, WorkerRuntime) picks up
  // freshly-flavored worker definitions instead of the ones baked in at
  // module load.
  replaceAll(workers: WorkerInstance[]): void {
    this.workers.clear();
    this.registerAll(workers);
  }

  unregister(id: string): void {
    this.workers.delete(id);
  }

  getAll(): WorkerInstance[] {
    return Array.from(this.workers.values());
  }

  getById(id: string): WorkerInstance | undefined {
    return this.workers.get(id);
  }

  getByDepartment(department: string): WorkerInstance[] {
    return this.getAll().filter((worker) => worker.definition.department === department);
  }

  getAvailable(): WorkerInstance[] {
    return this.getAll().filter((worker) => worker.isAvailable());
  }

  count(): number {
    return this.workers.size;
  }
}

// A singleton so every page and service shares one roster. registerAll() and
// register() stay public so future workers can be added without touching
// this file — the registry is capable of hosting unlimited workers.
export const WorkerRegistry = new WorkerRegistryImpl(buildWorkforceRoster());
