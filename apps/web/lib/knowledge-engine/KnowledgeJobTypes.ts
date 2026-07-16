export type KnowledgeJobStatus = "queued" | "processing" | "completed" | "failed";

// Prepares the architecture for asynchronous learning without building a
// queue (no BullMQ/RabbitMQ, no background worker — Capability 11,
// Phase C10). Today CompanySourceIngestion.ts creates and transitions
// this record synchronously, in the same request, purely so a future
// async pipeline reads/writes the same shape instead of triggering a
// redesign.
export interface KnowledgeJob {
  id: string;
  companyId: string;
  documentId: string;
  status: KnowledgeJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}
