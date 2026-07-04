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

export interface VectorStore {
  name: string;
  isImplemented: boolean;
  upsert(record: VectorRecord): Promise<void>;
  query(vector: EmbeddingVector, topK: number): Promise<VectorQueryResult[]>;
  delete(id: string): Promise<void>;
}
