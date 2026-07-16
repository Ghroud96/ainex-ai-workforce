import type { TrackedFact } from "@/lib/knowledge-engine/KnowledgeExtractionTypes";
import type { ExtractedSwot } from "@/lib/knowledge-engine/KnowledgeExtractionTypes";
import type { KnowledgeSourceReference } from "@/lib/knowledge-engine/KnowledgeSourceTypes";
import type { ConfidenceLabel, ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

// The scalar, company-level facts — not a list, so no `id`.
export interface CompanyProfile {
  companyName?: TrackedFact<string>;
  industry?: TrackedFact<string>;
  businessModel?: TrackedFact<string>;
}

// The shared shape behind every list-entity profile type (Step 4:
// DepartmentProfile, ProductProfile, ServiceProfile, CustomerProfile,
// SupplierProfile, PolicyProfile, ProcessProfile, BusinessRisk,
// BusinessOpportunity, BusinessObjective, KPIProfile, ComplianceProfile,
// plus glossary/keyPeople/contacts/importantDates) — structurally
// identical today (id, name, an optional free-text detail, and the
// usual confidence/source/timestamp tracking), named distinctly per
// domain concept for readability rather than duplicated eleven times.
// `id` is assigned once (a slug of `name`) and kept stable across every
// future merge — it's what CompanyIntelligenceChange.entityId points at.
export interface TrackedEntityProfile {
  id: string;
  name: string;
  detail?: string;
  confidence: ConfidenceScore;
  sources: KnowledgeSourceReference[];
  createdAt: string;
  updatedAt: string;
}

export type DepartmentProfile = TrackedEntityProfile;
export type ProductProfile = TrackedEntityProfile;
export type ServiceProfile = TrackedEntityProfile;
export type CustomerProfile = TrackedEntityProfile;
export type SupplierProfile = TrackedEntityProfile;
export type PolicyProfile = TrackedEntityProfile;
export type ProcessProfile = TrackedEntityProfile;
export type BusinessRisk = TrackedEntityProfile;
export type BusinessOpportunity = TrackedEntityProfile;
export type BusinessObjective = TrackedEntityProfile;
export type KPIProfile = TrackedEntityProfile;
export type ComplianceProfile = TrackedEntityProfile;

// The aggregate Company Intelligence record — real structured objects,
// not an AI summary blob. `version`/`createdAt`/`updatedAt` are the
// lightweight version awareness Capability 11 requires: `version`
// increments on every successful merge (CompanyIntelligenceBuilder),
// `updatedAt` moves with it, `createdAt` is fixed at first creation.
export interface CompanyIntelligenceProfile {
  companyId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  company: CompanyProfile;
  departments: DepartmentProfile[];
  products: ProductProfile[];
  services: ServiceProfile[];
  customers: CustomerProfile[];
  suppliers: SupplierProfile[];
  policies: PolicyProfile[];
  processes: ProcessProfile[];
  risks: BusinessRisk[];
  opportunities: BusinessOpportunity[];
  objectives: BusinessObjective[];
  kpis: KPIProfile[];
  compliance: ComplianceProfile[];
  importantDates: TrackedEntityProfile[];
  glossary: TrackedEntityProfile[];
  keyPeople: TrackedEntityProfile[];
  contacts: TrackedEntityProfile[];
  swot?: TrackedFact<ExtractedSwot>;
}

// A lightweight read of the profile's learning maturity — not stored
// separately, computed on read by CompanyIntelligenceService (a
// documented future caching point). Not a UI requirement this pass;
// exists so a future dashboard can show learning maturity without
// recomputing the whole profile.
export interface CompanyKnowledgeStatus {
  knowledgeCoverage: number;
  knowledgeQuality: ConfidenceLabel;
  documentCount: number;
  knowledgeSourceCount: number;
  averageConfidence: number;
  lastLearningAt: string;
  version: number;
}
