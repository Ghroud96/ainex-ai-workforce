import type { Document, SourceFileType } from "@/lib/knowledge/types";

export interface ParsedDocument {
  documentId: string;
  text: string;
  pageCount?: number;
}

export interface DocumentParser {
  supports: SourceFileType[];
  parse(document: Document): ParsedDocument;
}
