import type { ActionStatus } from "@/lib/action/ActionTypes";

export interface ActionAuditEntry {
  id: string;
  actionRequestId: string;
  actionId: string;
  workerId: string;
  status: ActionStatus;
  timestamp: string;
  detail: string;
}

let entryCounter = 0;
function nextEntryId(): string {
  entryCounter += 1;
  return `audit-${entryCounter}`;
}

// The Auditability guarantee CLAUDE.md's Enterprise Principles require
// ("every action a Digital Worker triggers is traceable") for the new
// Action Layer specifically. In-memory, resets on server restart — same
// scope as every other Sprint 4+ mock store; a real deployment backs
// this with the Database (see ARCHITECTURE.md — Data Layer).
class ActionAuditLogStore {
  private entries: ActionAuditEntry[] = [];

  record(entry: Omit<ActionAuditEntry, "id" | "timestamp">): ActionAuditEntry {
    const recorded: ActionAuditEntry = { ...entry, id: nextEntryId(), timestamp: new Date().toISOString() };
    this.entries.push(recorded);
    return recorded;
  }

  getAll(): ActionAuditEntry[] {
    return [...this.entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  getByWorker(workerId: string): ActionAuditEntry[] {
    return this.getAll().filter((entry) => entry.workerId === workerId);
  }

  getByAction(actionId: string): ActionAuditEntry[] {
    return this.getAll().filter((entry) => entry.actionId === actionId);
  }
}

export const actionAuditLog = new ActionAuditLogStore();
