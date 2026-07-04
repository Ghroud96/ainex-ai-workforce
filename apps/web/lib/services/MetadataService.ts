import { defaultMetadataExtractor } from "@/lib/metadata/extractor";
import type { Document, DocumentMetadata } from "@/lib/knowledge/types";

export const MetadataService = {
  extract(document: Document): DocumentMetadata {
    return defaultMetadataExtractor.extract(document);
  },
};
