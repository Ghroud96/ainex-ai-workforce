import type {
  CompanyMemory,
  ConversationMemory,
  ConversationTurn,
  KnowledgeMemory,
  LongTermMemory,
  ShortTermMemory,
  WorkerMemorySnapshot,
  WorkerMemoryStore,
} from "@/lib/workforce/WorkerMemory";

// Extends the read-only contract Sprint 5 defined (WorkerMemoryStore)
// with the write operations a real engine needs, rather than redefining
// a competing memory interface.
export interface WritableMemoryStore extends WorkerMemoryStore {
  rememberShortTerm(workerId: string, sessionId: string, entry: string): void;
  appendConversation(workerId: string, turn: ConversationTurn): void;
  rememberCompanyFact(companyId: string, fact: string): void;
  rememberKnowledgeUsage(workerId: string, documentId: string): void;
  rememberLongTermSummary(workerId: string, summary: string): void;
  clearSession(workerId: string, sessionId: string): void;
}

const MAX_CONVERSATION_TURNS = 50;

// Still architecture-first, no database — but unlike Sprint 5's inert
// placeholder, this store actually reads and writes in-process. Memory
// resets on server restart; nothing here is persisted.
export class InMemoryMemoryStore implements WritableMemoryStore {
  private shortTerm = new Map<string, ShortTermMemory>();
  private conversations = new Map<string, ConversationMemory>();
  private companyMemories = new Map<string, CompanyMemory>();
  private knowledgeMemories = new Map<string, KnowledgeMemory>();
  private longTerm = new Map<string, LongTermMemory>();

  rememberShortTerm(workerId: string, sessionId: string, entry: string): void {
    const existing = this.shortTerm.get(workerId);
    const entries = existing && existing.sessionId === sessionId ? [...existing.entries, entry] : [entry];
    this.shortTerm.set(workerId, { workerId, sessionId, entries });
  }

  appendConversation(workerId: string, turn: ConversationTurn): void {
    const existing = this.conversations.get(workerId);
    const turns = [...(existing?.turns ?? []), turn].slice(-MAX_CONVERSATION_TURNS);
    this.conversations.set(workerId, { workerId, turns });
  }

  rememberCompanyFact(companyId: string, fact: string): void {
    const existing = this.companyMemories.get(companyId);
    const facts = existing ? [...existing.facts, fact] : [fact];
    this.companyMemories.set(companyId, { companyId, facts });
  }

  rememberKnowledgeUsage(workerId: string, documentId: string): void {
    const existing = this.knowledgeMemories.get(workerId);
    const recalledDocumentIds = existing?.recalledDocumentIds.includes(documentId)
      ? existing.recalledDocumentIds
      : [...(existing?.recalledDocumentIds ?? []), documentId];
    this.knowledgeMemories.set(workerId, { workerId, recalledDocumentIds });
  }

  rememberLongTermSummary(workerId: string, summary: string): void {
    this.longTerm.set(workerId, { workerId, summary });
  }

  clearSession(workerId: string, sessionId: string): void {
    const existing = this.shortTerm.get(workerId);
    if (existing?.sessionId === sessionId) {
      this.shortTerm.delete(workerId);
    }
    this.conversations.delete(workerId);
  }

  getShortTerm(workerId: string): ShortTermMemory | undefined {
    return this.shortTerm.get(workerId);
  }

  getConversation(workerId: string): ConversationMemory | undefined {
    return this.conversations.get(workerId);
  }

  getCompanyMemory(companyId: string): CompanyMemory | undefined {
    return this.companyMemories.get(companyId);
  }

  getKnowledgeMemory(workerId: string): KnowledgeMemory | undefined {
    return this.knowledgeMemories.get(workerId);
  }

  getLongTerm(workerId: string): LongTermMemory | undefined {
    return this.longTerm.get(workerId);
  }

  snapshot(workerId: string, companyId: string): WorkerMemorySnapshot {
    return {
      shortTerm: this.getShortTerm(workerId),
      conversation: this.getConversation(workerId),
      company: this.getCompanyMemory(companyId),
      knowledge: this.getKnowledgeMemory(workerId),
      longTerm: this.getLongTerm(workerId),
    };
  }
}

export const memoryStore: WritableMemoryStore = new InMemoryMemoryStore();
