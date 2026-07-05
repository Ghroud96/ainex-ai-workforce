export type SourceFileType = "PDF" | "DOCX" | "TXT" | "CSV" | "Excel" | "Image";

export type ChunkStrategyName = "paragraph" | "page" | "sliding-window" | "semantic";

export type PipelineStatus = "Uploaded" | "Processing" | "Indexed" | "Ready" | "Pending" | "Failed";

export interface DocumentMetadata {
  title: string;
  department: string;
  author: string;
  createdDate: string;
  tags: string[];
  category: string;
  version: string;
  status: string;
}

export interface Document {
  id: string;
  fileName: string;
  fileType: SourceFileType;
  sizeKb: number;
  metadata: DocumentMetadata;
  // Raw source text, when the caller already has it (e.g. a mock
  // document's description). Optional because real file parsing
  // (Phase 2) will extract this from the uploaded file itself instead —
  // parsers fall back to placeholder text when it's absent.
  content?: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  index: number;
  content: string;
  strategy: ChunkStrategyName;
  tokenCount: number;
}

export interface KnowledgeIndexEntry {
  chunkId: string;
  documentId: string;
  vectorId: string;
  metadata: DocumentMetadata;
}

export interface KnowledgeIndex {
  documentId: string;
  entries: KnowledgeIndexEntry[];
  status: PipelineStatus;
  updatedAt: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  score: number;
  content: string;
  metadata: DocumentMetadata;
}

export interface RetrievalContext {
  query: string;
  workerName?: string;
  department?: string;
  results: SearchResult[];
}
