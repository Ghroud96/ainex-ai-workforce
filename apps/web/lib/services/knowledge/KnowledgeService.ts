import { getChunkStrategy } from "@/lib/chunker/strategies";
import type { ChunkStrategyName, Document, DocumentChunk, KnowledgeIndex } from "@/lib/knowledge/types";
import { IndexService } from "@/lib/services/IndexService";
import { MetadataService } from "@/lib/services/MetadataService";
import { ParserService } from "@/lib/services/ParserService";

export interface IngestedDocument {
  document: Document;
  chunks: DocumentChunk[];
  index: KnowledgeIndex;
}

export const KnowledgeService = {
  async ingest(
    document: Document,
    strategyName: ChunkStrategyName = "paragraph",
  ): Promise<IngestedDocument> {
    const parsed = ParserService.parse(document);
    const metadata = MetadataService.extract(document);
    const strategy = getChunkStrategy(strategyName);
    const chunks = strategy.chunk(parsed);
    const index = await IndexService.index(document.id, chunks, metadata);

    return { document, chunks, index };
  },
};
