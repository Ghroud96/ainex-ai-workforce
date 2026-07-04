import type { EmbeddingVector } from "@/lib/embeddings/types";
import type { VectorQueryResult, VectorRecord, VectorStore } from "@/lib/vector/types";

function notImplemented(storeName: string): never {
  throw new Error(`${storeName} vector store is not implemented yet — see ARCHITECTURE.md.`);
}

function unimplementedStore(name: string): VectorStore {
  return {
    name,
    isImplemented: false,
    upsert: async () => notImplemented(name),
    query: async () => notImplemented(name),
    delete: async () => notImplemented(name),
  };
}

export const qdrantVectorStore = unimplementedStore("Qdrant");
export const pineconeVectorStore = unimplementedStore("Pinecone");
export const weaviateVectorStore = unimplementedStore("Weaviate");
export const pgVectorStore = unimplementedStore("PGVector");
export const milvusVectorStore = unimplementedStore("Milvus");

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dot / (magnitudeA * magnitudeB);
}

class InMemoryVectorStore implements VectorStore {
  name = "In-Memory";
  isImplemented = true;
  private records: VectorRecord[] = [];

  async upsert(record: VectorRecord): Promise<void> {
    this.records = this.records.filter((existing) => existing.id !== record.id);
    this.records.push(record);
  }

  async query(vector: EmbeddingVector, topK: number): Promise<VectorQueryResult[]> {
    return this.records
      .map((record) => ({
        id: record.id,
        score: cosineSimilarity(vector.values, record.vector.values),
        metadata: record.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async delete(id: string): Promise<void> {
    this.records = this.records.filter((record) => record.id !== id);
  }
}

// No real vector database is connected this sprint. This in-memory store
// implements the same VectorStore interface the real providers below will,
// so the retrieval architecture can run without an external dependency.
export const inMemoryVectorStore = new InMemoryVectorStore();

export const vectorStores: VectorStore[] = [
  inMemoryVectorStore,
  qdrantVectorStore,
  pineconeVectorStore,
  weaviateVectorStore,
  pgVectorStore,
  milvusVectorStore,
];

export const activeVectorStore: VectorStore = inMemoryVectorStore;
