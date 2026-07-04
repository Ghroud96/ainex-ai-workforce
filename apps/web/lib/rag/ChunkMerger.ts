import type { RankedSource } from "@/lib/rag/RAGTypes";

// Combines multiple ranked chunks that belong to the same document into
// one context entry. With today's mock chunk strategies most documents
// produce a single chunk, so this mostly passes through — but it is real
// logic, not a placeholder, for when a sliding-window or page strategy
// produces several chunks per document.
export function mergeChunks(sources: RankedSource[]): RankedSource[] {
  const byDocument = new Map<string, RankedSource[]>();

  for (const source of sources) {
    const documentId = source.result.documentId;
    const group = byDocument.get(documentId) ?? [];
    group.push(source);
    byDocument.set(documentId, group);
  }

  const merged: RankedSource[] = [];

  for (const group of byDocument.values()) {
    const sorted = [...group].sort((a, b) => a.rank - b.rank);
    const best = sorted[0];

    if (sorted.length === 1) {
      merged.push(best);
      continue;
    }

    const combinedContent = [...sorted]
      .sort((a, b) => a.result.chunkId.localeCompare(b.result.chunkId))
      .map((entry) => entry.result.content)
      .join("\n---\n");

    merged.push({
      ...best,
      result: { ...best.result, content: combinedContent },
      mergedFrom: sorted.length,
    });
  }

  return merged.sort((a, b) => a.rank - b.rank);
}
