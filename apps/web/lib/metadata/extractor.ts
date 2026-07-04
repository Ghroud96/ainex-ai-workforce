import type { Document, DocumentMetadata } from "@/lib/knowledge/types";
import type { MetadataExtractor } from "@/lib/metadata/types";

// Placeholder: real extraction (NLP/LLM-based tagging) is Phase 2. For now,
// metadata is attached to the Document at ingestion time and passed through.
export const defaultMetadataExtractor: MetadataExtractor = {
  extract(document: Document): DocumentMetadata {
    return document.metadata;
  },
};
