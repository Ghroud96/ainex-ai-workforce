import type { Category } from "@/data/categories";
import type { Department } from "@/data/departments";
import { COMPANY_SIZE_TIERS } from "@/lib/enterprise/CompanySizeTiers";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { buildDocumentsFromCompany } from "@/lib/enterprise/DocumentContentBuilder";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";

export type DocumentStatusValue = "Indexed" | "Pending" | "Processing" | "Archived";

export const PROCESSING_STAGES = [
  "Uploaded",
  "Parsing",
  "Chunking",
  "Embedding",
  "Indexed",
  "Available",
  "Archived",
] as const;

export type ProcessingStage = (typeof PROCESSING_STAGES)[number];

export type FileType = "PDF" | "DOCX" | "DOC" | "XLSX" | "CSV" | "TXT" | "PPTX" | "Image";

// This is currently AINEX's concrete Company Intelligence record shape —
// every worker-facing "what does AINEX know" surface reads from this type,
// not a source-agnostic one. A future phase that ingests non-document
// Company Sources (a CRM row, an ERP line item) would need a more general
// CompanyIntelligenceRecord; deliberately not built ahead of that need —
// see docs/product/hybrid-enterprise-demo.md.
export type DigitalDocument = {
  id: string;
  name: string;
  description: string;
  department: Department;
  owner: string;
  category: Category;
  version: string;
  uploadDate: string;
  status: DocumentStatusValue;
  processingStage: ProcessingStage;
  fileType: FileType;
  sizeKb: number;
  tags: string[];
  usedBy: string[];
  workflows: string[];
  relatedDocuments: string[];
  // Distinguishes seeded demo fiction from a real customer upload — drives
  // the "Demo Knowledge" vs "Your Company Knowledge" badge throughout the
  // UI. See components/KnowledgeSourceBadge.tsx.
  source: "demo" | "customer-upload";
};

export function formatFileSize(kb: number): string {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`;
  }
  return `${kb} KB`;
}

// The Knowledge Hub's documents, flavored for whatever company is
// currently selected (see lib/enterprise/CompanyProfileStore.ts). Called
// fresh every time — not a cached module-load array — so a company
// profile switch is reflected on the next read. Document count scales by
// company size, but the underlying document ids are a stable, ordered
// subset of a fixed 20-role list (see DocumentContentBuilder.ts) — safe
// for generateStaticParams, since Next.js falls back to on-demand
// rendering for any id outside the build-time set.
export function getAllDocuments(): DigitalDocument[] {
  const uploaded = UploadedDocumentStore.getAll();

  // Live Provider never injects demo knowledge — only real uploads count.
  // Demo Provider keeps generating its deterministic document set exactly
  // as before. CompanyModeStore is already the single source of truth for
  // which provider is active (see CompanyDataProvider.ts).
  if (!CompanyModeStore.isDemoModeEnabled()) {
    return uploaded;
  }

  const selection = CompanyProfileStore.getCurrent();
  const tier = COMPANY_SIZE_TIERS[selection.size];
  const generated = buildDocumentsFromCompany(selection.company, tier.documentCount.max);
  return [...uploaded, ...generated];
}

export function getDocumentById(id: string): DigitalDocument | undefined {
  return getAllDocuments().find((document) => document.id === id);
}
