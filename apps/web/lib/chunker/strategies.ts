import type { ChunkStrategyName, DocumentChunk } from "@/lib/knowledge/types";
import type { ParsedDocument } from "@/lib/parser/types";
import type { ChunkStrategy } from "@/lib/chunker/types";

function buildChunk(
  parsed: ParsedDocument,
  index: number,
  content: string,
  strategy: ChunkStrategyName,
): DocumentChunk {
  return {
    id: `${parsed.documentId}-${strategy}-${index}`,
    documentId: parsed.documentId,
    index,
    content,
    strategy,
    tokenCount: Math.max(1, Math.round(content.length / 4)),
  };
}

export const paragraphChunkStrategy: ChunkStrategy = {
  name: "paragraph",
  chunk: (parsed) => [buildChunk(parsed, 0, parsed.text, "paragraph")],
};

export const pageChunkStrategy: ChunkStrategy = {
  name: "page",
  chunk: (parsed) =>
    Array.from({ length: parsed.pageCount ?? 1 }, (_, index) =>
      buildChunk(parsed, index, `${parsed.text} (page ${index + 1})`, "page"),
    ),
};

const SLIDING_WINDOW_SIZE = 200;
const SLIDING_WINDOW_OVERLAP = 50;

export const slidingWindowChunkStrategy: ChunkStrategy = {
  name: "sliding-window",
  chunk: (parsed) => {
    const chunks: DocumentChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < parsed.text.length) {
      const content = parsed.text.slice(start, start + SLIDING_WINDOW_SIZE);
      chunks.push(buildChunk(parsed, index, content, "sliding-window"));
      start += SLIDING_WINDOW_SIZE - SLIDING_WINDOW_OVERLAP;
      index += 1;
    }

    return chunks.length > 0 ? chunks : [buildChunk(parsed, 0, parsed.text, "sliding-window")];
  },
};

export const semanticChunkStrategy: ChunkStrategy = {
  name: "semantic",
  chunk: (parsed) => [buildChunk(parsed, 0, parsed.text, "semantic")],
};

export const chunkStrategies: ChunkStrategy[] = [
  paragraphChunkStrategy,
  pageChunkStrategy,
  slidingWindowChunkStrategy,
  semanticChunkStrategy,
];

export function getChunkStrategy(name: ChunkStrategyName): ChunkStrategy {
  return chunkStrategies.find((strategy) => strategy.name === name) ?? paragraphChunkStrategy;
}
