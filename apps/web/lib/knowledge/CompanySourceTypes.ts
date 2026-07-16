import type { DigitalDocument, FileType } from "@/data/documents";
import type { DocumentIntelligence } from "@/lib/knowledge-engine/KnowledgeExtractionTypes";
import type { TeachAinexSessionSnapshot } from "@/lib/knowledge/TeachAinexSessionStore";

// The input shape for lib/knowledge/CompanySourceIngestion.ts's
// ingestCompanySource() — deliberately source-agnostic. `sourceType` has
// exactly one real value today because exactly one source exists (a
// browser file upload); a future connector (a Drive/SharePoint-style
// document store, a CRM, an ERP, Shopify, email, a database) would add
// its own literal here and produce the same shape from its own content,
// not a new pipeline. See docs/product/hybrid-enterprise-demo.md.
export interface CompanySourceInput {
  sourceType: "upload";
  displayName: string;
  content: string;
  fileType: FileType;
  sizeKb: number;
}

export interface TrainedWorker {
  slug: string;
  name: string;
}

// The pipeline's output — one ingested Company Source's document record,
// its AI analysis, which Digital Workers now reference it, and the
// running Demo Session snapshot.
export interface TeachAinexResult {
  document: DigitalDocument;
  intelligence: DocumentIntelligence;
  workersNowTrained: TrainedWorker[];
  sessionSnapshot: TeachAinexSessionSnapshot;
}
