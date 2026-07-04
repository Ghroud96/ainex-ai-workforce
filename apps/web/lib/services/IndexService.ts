import { activeEmbeddingProvider } from "@/lib/embeddings/providers";
import type {
  DocumentChunk,
  DocumentMetadata,
  KnowledgeIndex,
  KnowledgeIndexEntry,
} from "@/lib/knowledge/types";
import { activeVectorStore } from "@/lib/vector/stores";

export const IndexService = {
  async index(
    documentId: string,
    chunks: DocumentChunk[],
    metadata: DocumentMetadata,
  ): Promise<KnowledgeIndex> {
    const entries: KnowledgeIndexEntry[] = [];

    for (const chunk of chunks) {
      const vector = await activeEmbeddingProvider.embed(chunk.content);
      const vectorId = `${chunk.id}-vector`;

      await activeVectorStore.upsert({
        id: vectorId,
        vector,
        metadata: { ...metadata, chunkId: chunk.id, documentId },
      });

      entries.push({ chunkId: chunk.id, documentId, vectorId, metadata });
    }

    return {
      documentId,
      entries,
      status: "Indexed",
      updatedAt: new Date().toISOString(),
    };
  },
};
