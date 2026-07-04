import type { Document, DocumentMetadata } from "@/lib/knowledge/types";

export interface MetadataExtractor {
  extract(document: Document): DocumentMetadata;
}
