import type { CompanyIntelligenceChange, CompanyIntelligenceEntityType } from "@/lib/knowledge-engine/CompanyIntelligenceChangeTypes";
import type {
  CompanyIntelligenceProfile,
  CompanyProfile,
  TrackedEntityProfile,
} from "@/lib/knowledge-engine/CompanyIntelligenceTypes";
import type { DocumentKnowledgeExtract, ExtractedEntity, ExtractedSwot, TrackedFact } from "@/lib/knowledge-engine/KnowledgeExtractionTypes";
import type { KnowledgeSourceReference } from "@/lib/knowledge-engine/KnowledgeSourceTypes";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

type EntityListField =
  | "departments"
  | "products"
  | "services"
  | "customers"
  | "suppliers"
  | "policies"
  | "processes"
  | "risks"
  | "opportunities"
  | "objectives"
  | "kpis"
  | "compliance"
  | "importantDates"
  | "glossary"
  | "keyPeople"
  | "contacts";

// One profile list field maps to one entityType for the change log —
// "risks"/"opportunities" plural fields correspond to singular entity
// types (a single BusinessRisk, not "risks" as a concept).
const ENTITY_TYPE_BY_FIELD: Record<EntityListField, CompanyIntelligenceEntityType> = {
  departments: "department",
  products: "product",
  services: "service",
  customers: "customer",
  suppliers: "supplier",
  policies: "policy",
  processes: "process",
  risks: "risk",
  opportunities: "opportunity",
  objectives: "objective",
  kpis: "kpi",
  compliance: "compliance",
  importantDates: "importantDate",
  glossary: "glossary",
  keyPeople: "keyPerson",
  contacts: "contact",
};

function slugify(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "entity";
}

function confidenceFromValue(value: number, basis: string): ConfidenceScore {
  const bounded = Math.min(1, Math.max(0, value));
  return { value: bounded, label: bounded >= 0.7 ? "High" : bounded >= 0.4 ? "Medium" : "Low", basis };
}

function mergeSources(existing: KnowledgeSourceReference[], incoming: KnowledgeSourceReference[]): KnowledgeSourceReference[] {
  const merged = [...existing];
  for (const reference of incoming) {
    const alreadyPresent = merged.some((entry) => entry.sourceType === reference.sourceType && entry.sourceId === reference.sourceId);
    if (!alreadyPresent) merged.push(reference);
  }
  return merged;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

// The incremental-learning core (Step 3): merges one document's
// extraction into the current profile. Never deletes an existing fact a
// new document doesn't mention — additive only. Scalar facts keep
// whichever value has higher confidence; list entities match by
// case-insensitive name, updating the matched entry or appending a new
// one. Bumps `profile.version` once per call and stamps every emitted
// change with that same version. Provenance is not a separate parameter
// here — every TrackedFact in `extract` already carries its own
// `sources` (stamped by KnowledgeExtractionService, which knows exactly
// which document it read), so the Builder only ever unions/forwards
// those references, never invents its own. Repositories persist the
// result; CompanyIntelligenceService is the only caller of this function.
export function mergeExtractIntoProfile(
  existing: CompanyIntelligenceProfile | undefined,
  extract: DocumentKnowledgeExtract,
  companyId: string,
): { profile: CompanyIntelligenceProfile; changes: CompanyIntelligenceChange[] } {
  const now = new Date().toISOString();
  const nextVersion = (existing?.version ?? 0) + 1;
  const changes: CompanyIntelligenceChange[] = [];

  function recordChange(entityType: CompanyIntelligenceEntityType, entityId: string, field: string, previousValue: unknown, nextValue: unknown, sourceRefs: KnowledgeSourceReference[]) {
    changes.push({
      id: crypto.randomUUID(),
      profileVersion: nextVersion,
      entityType,
      entityId,
      field,
      previousValue,
      nextValue,
      sourceReferences: sourceRefs,
      changedAt: now,
    });
  }

  function mergeScalarFact(current: TrackedFact<string> | undefined, incoming: TrackedFact<string> | undefined, field: string): TrackedFact<string> | undefined {
    if (!incoming) return current;
    if (!current) {
      recordChange("company", "company", field, undefined, incoming.value, incoming.sources);
      return { ...incoming, createdAt: now, updatedAt: now };
    }
    if (incoming.confidence.value > current.confidence.value && incoming.value !== current.value) {
      recordChange("company", "company", field, current.value, incoming.value, incoming.sources);
      return { value: incoming.value, confidence: incoming.confidence, sources: mergeSources(current.sources, incoming.sources), createdAt: current.createdAt, updatedAt: now };
    }
    // Same or lower-confidence corroboration — keep the value, still record the new source.
    return { ...current, sources: mergeSources(current.sources, incoming.sources), updatedAt: now };
  }

  function mergeEntityList(currentList: TrackedEntityProfile[], incomingFacts: TrackedFact<ExtractedEntity>[], field: EntityListField): TrackedEntityProfile[] {
    const entityType = ENTITY_TYPE_BY_FIELD[field];
    const result = [...currentList];

    for (const fact of incomingFacts) {
      const normalizedName = fact.value.name.trim().toLowerCase();
      const index = result.findIndex((entity) => entity.name.trim().toLowerCase() === normalizedName);

      if (index === -1) {
        const id = `${field}-${slugify(fact.value.name)}`;
        const entity: TrackedEntityProfile = {
          id,
          name: fact.value.name,
          detail: fact.value.detail,
          confidence: fact.confidence,
          sources: fact.sources,
          createdAt: now,
          updatedAt: now,
        };
        result.push(entity);
        recordChange(entityType, id, "name", undefined, entity.name, fact.sources);
        if (entity.detail) {
          recordChange(entityType, id, "detail", undefined, entity.detail, fact.sources);
        }
        continue;
      }

      const currentEntity = result[index];
      const mergedConfidenceValue = Math.max(currentEntity.confidence.value, fact.confidence.value);
      const mergedSources = mergeSources(currentEntity.sources, fact.sources);
      let detail = currentEntity.detail;

      if (fact.value.detail && fact.value.detail !== currentEntity.detail && (!currentEntity.detail || fact.confidence.value > currentEntity.confidence.value)) {
        recordChange(entityType, currentEntity.id, "detail", currentEntity.detail, fact.value.detail, fact.sources);
        detail = fact.value.detail;
      }

      result[index] = {
        ...currentEntity,
        detail,
        confidence: confidenceFromValue(mergedConfidenceValue, "Corroborated across multiple sources."),
        sources: mergedSources,
        updatedAt: now,
      };
    }

    return result;
  }

  function mergeSwot(current: TrackedFact<ExtractedSwot> | undefined, incoming: TrackedFact<ExtractedSwot> | undefined): TrackedFact<ExtractedSwot> | undefined {
    if (!incoming) return current;

    if (!current) {
      for (const key of ["strengths", "weaknesses", "opportunities", "threats"] as const) {
        if (incoming.value[key].length > 0) {
          recordChange("swot", "swot", key, [], incoming.value[key], incoming.sources);
        }
      }
      return { ...incoming, createdAt: now, updatedAt: now };
    }

    const merged: ExtractedSwot = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
    for (const key of ["strengths", "weaknesses", "opportunities", "threats"] as const) {
      const union = Array.from(new Set([...current.value[key], ...incoming.value[key]]));
      merged[key] = union;
      if (!arraysEqual(union, current.value[key])) {
        recordChange("swot", "swot", key, current.value[key], union, incoming.sources);
      }
    }

    return {
      value: merged,
      confidence: confidenceFromValue(Math.max(current.confidence.value, incoming.confidence.value), "Corroborated across multiple sources."),
      sources: mergeSources(current.sources, incoming.sources),
      createdAt: current.createdAt,
      updatedAt: now,
    };
  }

  const currentCompany: CompanyProfile = existing?.company ?? {};
  const company: CompanyProfile = {
    companyName: mergeScalarFact(currentCompany.companyName, extract.companyName, "companyName"),
    industry: mergeScalarFact(currentCompany.industry, extract.industry, "industry"),
    businessModel: mergeScalarFact(currentCompany.businessModel, extract.businessModel, "businessModel"),
  };

  const profile: CompanyIntelligenceProfile = {
    companyId,
    version: nextVersion,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    company,
    departments: mergeEntityList(existing?.departments ?? [], extract.departments, "departments"),
    products: mergeEntityList(existing?.products ?? [], extract.products, "products"),
    services: mergeEntityList(existing?.services ?? [], extract.services, "services"),
    customers: mergeEntityList(existing?.customers ?? [], extract.customers, "customers"),
    suppliers: mergeEntityList(existing?.suppliers ?? [], extract.suppliers, "suppliers"),
    policies: mergeEntityList(existing?.policies ?? [], extract.policies, "policies"),
    processes: mergeEntityList(existing?.processes ?? [], extract.processes, "processes"),
    risks: mergeEntityList(existing?.risks ?? [], extract.risks, "risks"),
    opportunities: mergeEntityList(existing?.opportunities ?? [], extract.opportunities, "opportunities"),
    objectives: mergeEntityList(existing?.objectives ?? [], extract.objectives, "objectives"),
    kpis: mergeEntityList(existing?.kpis ?? [], extract.kpis, "kpis"),
    compliance: mergeEntityList(existing?.compliance ?? [], extract.compliance, "compliance"),
    importantDates: mergeEntityList(existing?.importantDates ?? [], extract.importantDates, "importantDates"),
    glossary: mergeEntityList(existing?.glossary ?? [], extract.glossary, "glossary"),
    keyPeople: mergeEntityList(existing?.keyPeople ?? [], extract.keyPeople, "keyPeople"),
    contacts: mergeEntityList(existing?.contacts ?? [], extract.contacts, "contacts"),
    swot: mergeSwot(existing?.swot, extract.swot),
  };

  return { profile, changes };
}
