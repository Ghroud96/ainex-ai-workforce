import type { EmbeddingVector } from "@/lib/embeddings/types";
import type { VectorFilter, VectorQueryResult, VectorRecord, VectorStore } from "@/lib/vector/types";

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

export const pineconeVectorStore = unimplementedStore("Pinecone");
export const weaviateVectorStore = unimplementedStore("Weaviate");
export const pgVectorStore = unimplementedStore("PGVector");
export const milvusVectorStore = unimplementedStore("Milvus");

function matchesFilter(metadata: Record<string, unknown>, filter: VectorFilter): boolean {
  if (filter.department && metadata.department !== filter.department) return false;
  if (filter.category && metadata.category !== filter.category) return false;
  if (filter.documentId && metadata.documentId !== filter.documentId) return false;
  if (filter.workerId && metadata.workerId !== filter.workerId) return false;
  return true;
}

function cosineSimilarity(a: number[], b: number[]): number {
  // Records embedded by different providers (e.g. real OpenAI vectors
  // alongside older mock-fallback vectors) can have different lengths.
  // Comparing them index-by-index would silently produce NaN scores
  // instead of throwing — treat a dimension mismatch as "unrelated"
  // rather than let it corrupt ranking.
  if (a.length !== b.length) return 0;

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

  async query(vector: EmbeddingVector, topK: number, filter: VectorFilter = {}): Promise<VectorQueryResult[]> {
    return this.records
      .filter((record) => matchesFilter(record.metadata, filter))
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

const QDRANT_TIMEOUT_MS = 15000;

function buildQdrantFilter(filter: VectorFilter): Record<string, unknown> | undefined {
  const must = Object.entries(filter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, match: { value } }));

  return must.length > 0 ? { must } : undefined;
}

// Phase C5: a real adapter against Qdrant's REST API, implementing the
// same VectorStore interface as the in-memory store above — but it is
// never assigned to activeVectorStore, so no running Qdrant instance is
// required. Every method throws a friendly, actionable error if
// QDRANT_URL isn't set, the same pattern OpenAIProvider uses for a
// missing OPENAI_API_KEY. See docs/architecture/vector-store.md for
// activation instructions once a Qdrant instance exists.
class QdrantVectorStore implements VectorStore {
  name = "Qdrant";
  isImplemented = true;

  private get baseUrl(): string | undefined {
    return process.env.QDRANT_URL;
  }

  private get collection(): string {
    return process.env.QDRANT_COLLECTION ?? "ainex_knowledge";
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const apiKey = process.env.QDRANT_API_KEY;
    if (apiKey) headers["api-key"] = apiKey;
    return headers;
  }

  private ensureConfigured(): string {
    const baseUrl = this.baseUrl;
    if (!baseUrl) {
      throw new Error(
        "Qdrant is not configured. Set QDRANT_URL (and optionally QDRANT_API_KEY, QDRANT_COLLECTION) in apps/web/.env.local to activate it.",
      );
    }
    return baseUrl;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    const baseUrl = this.ensureConfigured();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QDRANT_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: this.headers(),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as { status?: { error?: string } } | null)?.status?.error;
        throw new Error(message ? `Qdrant request failed: ${message}` : `Qdrant request failed with status ${response.status}.`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("The request to Qdrant timed out. Please try again.");
      }
      if (error instanceof Error) throw error;
      throw new Error("Qdrant is currently unavailable. Please try again shortly.");
    } finally {
      clearTimeout(timeout);
    }
  }

  async upsert(record: VectorRecord): Promise<void> {
    await this.request(`/collections/${this.collection}/points`, {
      method: "PUT",
      body: JSON.stringify({
        points: [{ id: record.id, vector: record.vector.values, payload: record.metadata }],
      }),
    });
  }

  async query(vector: EmbeddingVector, topK: number, filter: VectorFilter = {}): Promise<VectorQueryResult[]> {
    const data = (await this.request(`/collections/${this.collection}/points/search`, {
      method: "POST",
      body: JSON.stringify({
        vector: vector.values,
        limit: topK,
        with_payload: true,
        filter: buildQdrantFilter(filter),
      }),
    })) as { result?: Array<{ id: string; score: number; payload: Record<string, unknown> }> };

    return (data.result ?? []).map((point) => ({
      id: point.id,
      score: point.score,
      metadata: point.payload,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.request(`/collections/${this.collection}/points/delete`, {
      method: "POST",
      body: JSON.stringify({ points: [id] }),
    });
  }
}

export const qdrantVectorStore = new QdrantVectorStore();

export const vectorStores: VectorStore[] = [
  inMemoryVectorStore,
  qdrantVectorStore,
  pineconeVectorStore,
  weaviateVectorStore,
  pgVectorStore,
  milvusVectorStore,
];

export const activeVectorStore: VectorStore = inMemoryVectorStore;
