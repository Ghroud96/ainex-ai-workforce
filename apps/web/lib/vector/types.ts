import type { EmbeddingVector } from "@/lib/embeddings/types";

export interface VectorRecord {
  id: string;
  vector: EmbeddingVector;
  metadata: Record<string, unknown>;
}

export interface VectorQueryResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

// Every field is optional and matched against VectorRecord.metadata by
// exact value — a store applies whichever fields are present, ignoring
// the rest. documentId and workerId aren't populated by the Knowledge
// Hub pipeline today (documents aren't worker-scoped, see
// docs/architecture/vector-store.md), but the store layer supports them
// now so a future caller (e.g. worker-private memory embeddings) doesn't
// need an interface change to use them.
export interface VectorFilter {
  department?: string;
  category?: string;
  documentId?: string;
  workerId?: string;
}

export interface VectorStore {
  name: string;
  isImplemented: boolean;
  upsert(record: VectorRecord): Promise<void>;
  query(vector: EmbeddingVector, topK: number, filter?: VectorFilter): Promise<VectorQueryResult[]>;
  delete(id: string): Promise<void>;
}
