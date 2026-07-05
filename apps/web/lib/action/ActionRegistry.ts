import { actions as seedActions } from "@/data/actions";
import type { Action, ActionType } from "@/lib/action/ActionTypes";

// Mirrors WorkerRegistry and WorkflowRegistry: a plain in-memory registry
// seeded from mock data, register/getAll/getById, ready for a future
// phase to register a real, customer-configured action without an
// interface change.
class ActionRegistryImpl {
  private actionsById = new Map<string, Action>();

  constructor(initial: Action[]) {
    this.registerAll(initial);
  }

  register(action: Action): void {
    this.actionsById.set(action.id, action);
  }

  registerAll(actions: Action[]): void {
    for (const action of actions) {
      this.register(action);
    }
  }

  getAll(): Action[] {
    return Array.from(this.actionsById.values());
  }

  getById(id: string): Action | undefined {
    return this.actionsById.get(id);
  }

  getByType(type: ActionType): Action[] {
    return this.getAll().filter((action) => action.type === type);
  }

  getForWorker(workerId: string): Action[] {
    return this.getAll().filter((action) => action.workerIds.includes(workerId));
  }
}

export const ActionRegistry = new ActionRegistryImpl(seedActions);
