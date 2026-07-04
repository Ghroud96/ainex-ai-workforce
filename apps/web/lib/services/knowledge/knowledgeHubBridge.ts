import { documents as knowledgeHubDocuments, type DigitalDocument, type DocumentStatusValue } from "@/data/documents";
import type { KnowledgeIndexEntry, Document, PipelineStatus } from "@/lib/knowledge/types";
import { KnowledgeService, type IngestedDocument } from "@/lib/services/knowledge/KnowledgeService";

function mapPipelineStatus(status: DocumentStatusValue): PipelineStatus {
  switch (status) {
    case "Indexed":
      return "Ready";
    case "Processing":
      return "Processing";
    case "Pending":
      return "Pending";
    case "Archived":
      return "Indexed";
  }
}

function mapFileType(fileType: DigitalDocument["fileType"]): Document["fileType"] {
  switch (fileType) {
    case "DOC":
      return "DOCX";
    case "XLSX":
      return "Excel";
    case "PPTX":
      return "DOCX";
    default:
      return fileType;
  }
}

function toDocument(source: DigitalDocument): Document {
  return {
    id: source.id,
    fileName: source.name,
    fileType: mapFileType(source.fileType),
    sizeKb: source.sizeKb,
    metadata: {
      title: source.name,
      department: source.department,
      author: source.owner,
      createdDate: source.uploadDate,
      tags: source.tags,
      category: source.category,
      version: source.version,
      status: source.status,
    },
  };
}

export interface KnowledgePipelineResult {
  document: Document;
  chunkCount: number;
  chunkStrategy: string;
  status: PipelineStatus;
  retrievalReady: boolean;
  previewText: string | null;
}

type CacheEntry = { ingested: IngestedDocument | null; status: PipelineStatus };

let cache: Map<string, CacheEntry> | null = null;

async function buildCache(): Promise<Map<string, CacheEntry>> {
  const entries = await Promise.all(
    knowledgeHubDocuments.map(async (source): Promise<readonly [string, CacheEntry]> => {
      const status = mapPipelineStatus(source.status);
      const readyToIndex = status === "Ready" || status === "Indexed";
      const ingested = readyToIndex ? await KnowledgeService.ingest(toDocument(source)) : null;
      return [source.id, { ingested, status }];
    }),
  );

  return new Map(entries);
}

async function getCache(): Promise<Map<string, CacheEntry>> {
  if (!cache) {
    cache = await buildCache();
  }
  return cache;
}

export async function getKnowledgePipelineResult(
  documentId: string,
): Promise<KnowledgePipelineResult | undefined> {
  const source = knowledgeHubDocuments.find((document) => document.id === documentId);
  if (!source) return undefined;

  const entry = (await getCache()).get(documentId);
  if (!entry) return undefined;

  return {
    document: entry.ingested?.document ?? toDocument(source),
    chunkCount: entry.ingested?.chunks.length ?? 0,
    chunkStrategy: entry.ingested?.chunks[0]?.strategy ?? "paragraph",
    status: entry.status,
    retrievalReady: Boolean(entry.ingested),
    previewText: entry.ingested?.chunks[0]?.content ?? null,
  };
}

export async function getKnowledgePipelineSummary(): Promise<Record<PipelineStatus, number>> {
  const counts: Record<PipelineStatus, number> = {
    Uploaded: 0,
    Processing: 0,
    Indexed: 0,
    Ready: 0,
    Pending: 0,
    Failed: 0,
  };

  for (const entry of (await getCache()).values()) {
    counts[entry.status] += 1;
  }

  return counts;
}

export async function getRetrievalReadyDocumentIds(): Promise<Set<string>> {
  const ready = new Set<string>();

  for (const [id, entry] of (await getCache()).entries()) {
    if (entry.ingested) ready.add(id);
  }

  return ready;
}

export interface CombinedKnowledgeIndex {
  indexEntries: KnowledgeIndexEntry[];
  chunkContentById: Map<string, string>;
}

// Aggregates every retrieval-ready document's index entries and chunk
// content into one combined index — what the Retrieval Engine (Phase B4)
// searches across, instead of one document's index at a time.
export async function getCombinedKnowledgeIndex(): Promise<CombinedKnowledgeIndex> {
  const indexEntries: KnowledgeIndexEntry[] = [];
  const chunkContentById = new Map<string, string>();

  for (const entry of (await getCache()).values()) {
    if (!entry.ingested) continue;

    indexEntries.push(...entry.ingested.index.entries);
    for (const chunk of entry.ingested.chunks) {
      chunkContentById.set(chunk.id, chunk.content);
    }
  }

  return { indexEntries, chunkContentById };
}
