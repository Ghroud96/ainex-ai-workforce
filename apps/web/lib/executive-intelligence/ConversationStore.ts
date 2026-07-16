import type { ConversationSession, ConversationTurn } from "@/lib/executive-intelligence/ExecutiveResponseTypes";

// In-memory, globalThis-anchored — the same pattern every store in this
// codebase uses. Session-only: nothing here is meant to survive a
// server restart, per the brief's "do not implement long-term
// conversational memory." Chat-channel-specific — a future non-chat
// caller of the shared pipeline (Dashboard action, Workflow trigger)
// has no reason to touch this store at all.
class ConversationStoreImpl {
  private sessions = new Map<string, ConversationSession>();

  create(companyId: string): ConversationSession {
    const now = new Date().toISOString();
    const session: ConversationSession = {
      id: crypto.randomUUID(),
      companyId,
      turns: [],
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId: string): ConversationSession | undefined {
    return this.sessions.get(sessionId);
  }

  appendTurn(sessionId: string, turn: ConversationTurn): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.turns.push(turn);
    session.updatedAt = turn.timestamp;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.ConversationStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: ConversationStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const ConversationStore: ConversationStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new ConversationStoreImpl());
