import type { Category } from "@/data/categories";
import type { Department } from "@/data/departments";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";
import type { KnowledgeSourceReference } from "@/lib/knowledge-engine/KnowledgeSourceTypes";

// A single piece of knowledge, generalized over provenance (Capability
// 11, Phase C10). A fact's origin is a list of source references, not a
// document-id array — document ingestion populates it with exactly one
// { sourceType: "document", sourceId } entry today, and a future ERP/
// CRM/Timeline extractor produces the identical shape with a different
// sourceType. `createdAt` is when this fact was first observed;
// `updatedAt` is when it was last confirmed/revised.
export interface TrackedFact<T> {
  value: T;
  confidence: ConfidenceScore;
  sources: KnowledgeSourceReference[];
  createdAt: string;
  updatedAt: string;
}

// The minimal shape a single extracted list entry needs — deliberately
// one generic shape for products/services/departments/customers/
// suppliers/policies/processes/kpis/objectives/risks/opportunities/
// compliance/importantDates/glossary/keyPeople/contacts, rather than a
// dozen near-identical interfaces. `detail` carries whatever's useful
// per field (a KPI's target, a person's role, a date's actual date, a
// glossary term's definition).
export interface ExtractedEntity {
  name: string;
  detail?: string;
}

export interface ExtractedSwot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// The legacy DocumentIntelligenceService.ts output shape, preserved
// verbatim so app/knowledge/document/[id]/page.tsx and
// TeachAinexWizard.tsx keep rendering identically — this pass changes
// where the analysis comes from, not what either page shows.
export interface DocumentIntelligence {
  executiveSummary: string;
  keyFindings: string[];
  businessRisks: string[];
  businessOpportunities: string[];
  recommendedActions: string[];
  executiveConclusion: string;
  suggestedCategory: Category;
  suggestedDepartment: Department;
  confidence: ConfidenceScore;
  knowledgeTags: string[];
  knowledgeSourcesUsed: string[];
  modelUsed: string;
  source: "Demo Mode" | "Live AI";
  generationTimeMs: number;
}

// Everything Knowledge Extraction (Step 2) produces from one document.
// Every field is a TrackedFact (or list of them) — unknown fields are
// simply absent, never fabricated (Step 10). `legacy` is the
// DocumentIntelligence-shaped subset every existing UI consumer reads.
export interface DocumentKnowledgeExtract {
  legacy: DocumentIntelligence;

  companyName?: TrackedFact<string>;
  industry?: TrackedFact<string>;
  businessModel?: TrackedFact<string>;

  products: TrackedFact<ExtractedEntity>[];
  services: TrackedFact<ExtractedEntity>[];
  departments: TrackedFact<ExtractedEntity>[];
  customers: TrackedFact<ExtractedEntity>[];
  suppliers: TrackedFact<ExtractedEntity>[];
  policies: TrackedFact<ExtractedEntity>[];
  processes: TrackedFact<ExtractedEntity>[];
  kpis: TrackedFact<ExtractedEntity>[];
  objectives: TrackedFact<ExtractedEntity>[];
  risks: TrackedFact<ExtractedEntity>[];
  opportunities: TrackedFact<ExtractedEntity>[];
  compliance: TrackedFact<ExtractedEntity>[];
  importantDates: TrackedFact<ExtractedEntity>[];
  glossary: TrackedFact<ExtractedEntity>[];
  keyPeople: TrackedFact<ExtractedEntity>[];
  contacts: TrackedFact<ExtractedEntity>[];

  swot?: TrackedFact<ExtractedSwot>;
}
