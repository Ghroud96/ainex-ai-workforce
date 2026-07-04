// Re-exports the Digital Workforce Engine's shared contracts so consumers
// can import from a stable `types/workforce` path. The engine internals
// live in `lib/workforce/` — this file is intentionally a thin barrel, not
// a second copy of these definitions.
export type {
  Capability,
  CapabilityCategory,
  PromptTemplate,
  Worker,
  WorkerAction,
  WorkerStatusValue,
} from "@/lib/workforce/WorkerTypes";
export type { WorkerContext, CompanyProfile } from "@/lib/workforce/WorkerContext";
export type {
  CompanyMemory,
  ConversationMemory,
  ConversationTurn,
  KnowledgeMemory,
  LongTermMemory,
  ShortTermMemory,
  WorkerMemorySnapshot,
} from "@/lib/workforce/WorkerMemory";
export type { WorkerHealth } from "@/lib/workforce/WorkerStatus";
export type { WorkerResponse, WorkerResponseStatus } from "@/lib/workforce/WorkerResponse";
export type { RoutingDecision, RoutingRequest } from "@/lib/workforce/WorkerRouter";
