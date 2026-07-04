import { memoryStore } from "@/lib/memory/MemoryStore";
import type { ConversationTurn, WorkerMemorySnapshot } from "@/lib/workforce/WorkerMemory";

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// The public façade a caller (Prompt Engine, and eventually Worker Engine)
// uses. Session memory, worker memory, and long-term memory all go
// through this one engine rather than three separate call sites.
export const MemoryEngine = {
  startSession(): string {
    return generateSessionId();
  },

  endSession(workerId: string, sessionId: string): void {
    memoryStore.clearSession(workerId, sessionId);
  },

  rememberShortTerm(workerId: string, sessionId: string, entry: string): void {
    memoryStore.rememberShortTerm(workerId, sessionId, entry);
  },

  appendUserMessage(workerId: string, content: string): void {
    memoryStore.appendConversation(workerId, {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    });
  },

  appendWorkerMessage(workerId: string, content: string): void {
    memoryStore.appendConversation(workerId, {
      role: "worker",
      content,
      timestamp: new Date().toISOString(),
    });
  },

  rememberCompanyFact(companyId: string, fact: string): void {
    memoryStore.rememberCompanyFact(companyId, fact);
  },

  rememberKnowledgeUsage(workerId: string, documentId: string): void {
    memoryStore.rememberKnowledgeUsage(workerId, documentId);
  },

  // Placeholder for the future Long Term Memory phase — callable today,
  // but nothing currently generates a summary to pass in.
  rememberLongTermSummary(workerId: string, summary: string): void {
    memoryStore.rememberLongTermSummary(workerId, summary);
  },

  recentHistory(workerId: string): ConversationTurn[] {
    return memoryStore.getConversation(workerId)?.turns ?? [];
  },

  recall(workerId: string, companyId: string): WorkerMemorySnapshot {
    return memoryStore.snapshot(workerId, companyId);
  },
};
