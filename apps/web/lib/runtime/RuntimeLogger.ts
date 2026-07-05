// Stage names match the Digital Worker Lifecycle exactly
// (CLAUDE.md#the-digital-worker-lifecycle: Knowledge -> Reasoning ->
// Decision -> Action -> Learning -> Reporting) — this logger is what
// makes that lifecycle auditable per CLAUDE.md's Enterprise Principles
// ("every Knowledge, Reasoning, Decision, and Action step is logged in a
// form a human can audit").
export type RuntimeLogStage = "Knowledge" | "Reasoning" | "Decision" | "Action" | "Learning" | "Reporting";

export interface RuntimeLogEntry {
  id: string;
  workerId: string;
  stage: RuntimeLogStage;
  message: string;
  timestamp: string;
}

let entryCounter = 0;
function nextEntryId(): string {
  entryCounter += 1;
  return `runtime-log-${entryCounter}`;
}

// In-memory, resets on server restart — same scope as every other
// Sprint 4+ mock store. A real deployment backs this with the Data
// Layer's Database, per ARCHITECTURE.md's Observability principle.
class RuntimeLoggerStore {
  private entries: RuntimeLogEntry[] = [];

  log(workerId: string, stage: RuntimeLogStage, message: string): RuntimeLogEntry {
    const entry: RuntimeLogEntry = { id: nextEntryId(), workerId, stage, message, timestamp: new Date().toISOString() };
    this.entries.push(entry);
    return entry;
  }

  getForWorker(workerId: string): RuntimeLogEntry[] {
    return this.entries.filter((entry) => entry.workerId === workerId);
  }

  getRecent(limit = 20): RuntimeLogEntry[] {
    return [...this.entries].slice(-limit).reverse();
  }
}

export const RuntimeLogger = new RuntimeLoggerStore();
