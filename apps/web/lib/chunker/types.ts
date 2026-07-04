import type { ChunkStrategyName, DocumentChunk } from "@/lib/knowledge/types";
import type { ParsedDocument } from "@/lib/parser/types";

export interface ChunkStrategy {
  name: ChunkStrategyName;
  chunk(parsed: ParsedDocument): DocumentChunk[];
}
