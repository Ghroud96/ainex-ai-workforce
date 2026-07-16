// The generic origin of a fact in Company Intelligence. Uploaded
// documents are only the first supported source — Company Intelligence
// must not assume every fact comes from a document (Capability 11,
// Phase C10). Every future connector (ERP, CRM, POS, Shopify, email,
// WhatsApp, SharePoint, Google Drive, database, workflow, company
// timeline, or a generic API) registers a `KnowledgeSource` and produces
// facts carrying the same `KnowledgeSourceReference` shape a document
// does today — no connector is built in this pass, only the abstraction.
export type KnowledgeSourceType =
  | "document"
  | "erp"
  | "crm"
  | "pos"
  | "shopify"
  | "email"
  | "whatsapp"
  | "sharepoint"
  | "google-drive"
  | "database"
  | "api"
  | "workflow"
  | "company-timeline";

export type KnowledgeSourceStatus = "active" | "inactive" | "error";

// One registered instance of a source — e.g. one uploaded document, or
// (in the future) one connected CRM account. Distinct from
// lib/company-intelligence/CompanyIntelligenceSource.ts's
// `CompanyIntelligenceRegistry`, which describes source *capabilities*
// ("is ERP ingestion implemented at all?"); this is source *instances*.
export interface KnowledgeSource {
  sourceId: string;
  sourceType: KnowledgeSourceType;
  sourceName: string;
  externalReference?: string;
  status: KnowledgeSourceStatus;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  metadata?: Record<string, unknown>;
}

// The lightweight pointer a TrackedFact carries — enough to trace a fact
// back to its origin without embedding the full KnowledgeSource object.
export interface KnowledgeSourceReference {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  label?: string;
}
