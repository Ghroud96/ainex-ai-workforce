export interface ShortTermMemory {
  workerId: string;
  sessionId: string;
  entries: string[];
}

export interface ConversationTurn {
  role: "user" | "worker";
  content: string;
  timestamp: string;
}

export interface ConversationMemory {
  workerId: string;
  turns: ConversationTurn[];
}

export interface CompanyMemory {
  companyId: string;
  facts: string[];
}

export interface KnowledgeMemory {
  workerId: string;
  recalledDocumentIds: string[];
}

export interface LongTermMemory {
  workerId: string;
  summary: string;
}

export interface WorkerMemorySnapshot {
  shortTerm?: ShortTermMemory;
  conversation?: ConversationMemory;
  company?: CompanyMemory;
  knowledge?: KnowledgeMemory;
  longTerm?: LongTermMemory;
}

export interface WorkerMemoryStore {
  getShortTerm(workerId: string): ShortTermMemory | undefined;
  getConversation(workerId: string): ConversationMemory | undefined;
  getCompanyMemory(companyId: string): CompanyMemory | undefined;
  getKnowledgeMemory(workerId: string): KnowledgeMemory | undefined;
  getLongTerm(workerId: string): LongTermMemory | undefined;
  snapshot(workerId: string, companyId: string): WorkerMemorySnapshot;
}

// Architecture only — no database. Everything here resets on server
// restart and nothing is currently written to it.
class InMemoryWorkerMemoryStore implements WorkerMemoryStore {
  private shortTerm = new Map<string, ShortTermMemory>();
  private conversations = new Map<string, ConversationMemory>();
  private companyMemories = new Map<string, CompanyMemory>();
  private knowledgeMemories = new Map<string, KnowledgeMemory>();
  private longTerm = new Map<string, LongTermMemory>();

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

export const workerMemoryStore: WorkerMemoryStore = new InMemoryWorkerMemoryStore();
