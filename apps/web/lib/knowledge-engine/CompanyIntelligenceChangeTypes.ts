import type { KnowledgeSourceReference } from "@/lib/knowledge-engine/KnowledgeSourceTypes";

export type CompanyIntelligenceEntityType =
  | "company"
  | "department"
  | "product"
  | "service"
  | "customer"
  | "supplier"
  | "policy"
  | "process"
  | "risk"
  | "opportunity"
  | "objective"
  | "kpi"
  | "compliance"
  | "importantDate"
  | "glossary"
  | "keyPerson"
  | "contact"
  | "swot";

// One entry per field that actually changed during a merge — a
// brand-new entity produces one change per populated field, not a
// single opaque "created" record, so the log stays queryable by field
// (Capability 11, Phase C10). Lightweight, append-only: not event
// sourcing, and never a full duplicate profile snapshot. Exists so a
// future capability can answer "what changed since last month?" without
// this capability building that experience — `field`/`previousValue`/
// `nextValue`/`changedAt` is all a future diff view needs.
export interface CompanyIntelligenceChange {
  id: string;
  profileVersion: number;
  entityType: CompanyIntelligenceEntityType;
  entityId: string;
  field: string;
  previousValue: unknown;
  nextValue: unknown;
  sourceReferences: KnowledgeSourceReference[];
  changedAt: string;
}
