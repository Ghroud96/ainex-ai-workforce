import { getAllDocuments } from "@/data/documents";
import { buildCompanyIntelligenceOverview } from "@/lib/company-intelligence/CompanyIntelligenceOverviewBuilder";
import { CompanyIntelligenceChangeLogRepository } from "@/lib/knowledge-engine/CompanyIntelligenceChangeLogRepository";
import { mergeExtractIntoProfile } from "@/lib/knowledge-engine/CompanyIntelligenceBuilder";
import { CompanyIntelligenceRepository } from "@/lib/knowledge-engine/CompanyIntelligenceRepository";
import type { CompanyIntelligenceChange } from "@/lib/knowledge-engine/CompanyIntelligenceChangeTypes";
import type { CompanyIntelligenceProfile, CompanyKnowledgeStatus } from "@/lib/knowledge-engine/CompanyIntelligenceTypes";
import type { DocumentKnowledgeExtract } from "@/lib/knowledge-engine/KnowledgeExtractionTypes";
import { KnowledgeSourceStore } from "@/lib/knowledge-engine/KnowledgeSourceStore";
import type { ConfidenceLabel } from "@/lib/reasoning/ReasoningTypes";

function labelForConfidence(value: number): ConfidenceLabel {
  return value >= 0.7 ? "High" : value >= 0.4 ? "Medium" : "Low";
}

function collectConfidenceValues(profile: CompanyIntelligenceProfile): number[] {
  const values: number[] = [];
  if (profile.company.companyName) values.push(profile.company.companyName.confidence.value);
  if (profile.company.industry) values.push(profile.company.industry.confidence.value);
  if (profile.company.businessModel) values.push(profile.company.businessModel.confidence.value);

  const lists = [
    profile.departments,
    profile.products,
    profile.services,
    profile.customers,
    profile.suppliers,
    profile.policies,
    profile.processes,
    profile.risks,
    profile.opportunities,
    profile.objectives,
    profile.kpis,
    profile.compliance,
    profile.importantDates,
    profile.glossary,
    profile.keyPeople,
    profile.contacts,
  ];
  for (const list of lists) {
    for (const entity of list) values.push(entity.confidence.value);
  }

  if (profile.swot) values.push(profile.swot.confidence.value);
  return values;
}

// The single read/write gateway for Company Intelligence (Capability 11,
// Phase C10). No consumer — Dashboard, Digital Workers, or a future
// Executive Conversation — touches CompanyIntelligenceRepository or
// CompanyIntelligenceChangeLogRepository directly; every one of them
// goes through this service instead, which is the natural seam for
// caching, authorization, and metrics once any of those become real
// requirements (none are built now). Repositories stay persistence-only;
// CompanyIntelligenceBuilder stays the only place merge/change-detection
// logic lives.
export const CompanyIntelligenceService = {
  getProfile(companyId: string): CompanyIntelligenceProfile | undefined {
    return CompanyIntelligenceRepository.get(companyId);
  },

  // The only write path — CompanySourceIngestion.ts (and any future
  // Company Source adapter) calls this, never the Builder or either
  // repository directly.
  applyExtraction(companyId: string, extract: DocumentKnowledgeExtract): { profile: CompanyIntelligenceProfile; changes: CompanyIntelligenceChange[] } {
    const existing = CompanyIntelligenceRepository.get(companyId);
    const result = mergeExtractIntoProfile(existing, extract, companyId);

    CompanyIntelligenceRepository.save(companyId, result.profile);
    CompanyIntelligenceChangeLogRepository.append(companyId, result.changes);

    return result;
  },

  getChangeHistory(companyId: string): CompanyIntelligenceChange[] {
    return CompanyIntelligenceChangeLogRepository.getAll(companyId);
  },

  // A lightweight read of the profile's learning maturity — computed on
  // read, not stored separately (a documented future caching point, not
  // built now). Not a UI requirement this pass; exists so a future
  // dashboard can show learning maturity without recomputing the whole
  // profile. `knowledgeCoverage` reuses the existing
  // buildCompanyIntelligenceOverview().coverageScore rather than
  // duplicating that computation.
  getKnowledgeStatus(companyId: string): CompanyKnowledgeStatus {
    const profile = CompanyIntelligenceRepository.get(companyId);
    const confidenceValues = profile ? collectConfidenceValues(profile) : [];
    const averageConfidence = confidenceValues.length > 0 ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length : 0;

    return {
      knowledgeCoverage: buildCompanyIntelligenceOverview().coverageScore,
      knowledgeQuality: labelForConfidence(averageConfidence),
      documentCount: getAllDocuments().length,
      knowledgeSourceCount: KnowledgeSourceStore.getAll().length,
      averageConfidence,
      lastLearningAt: profile?.updatedAt ?? new Date(0).toISOString(),
      version: profile?.version ?? 0,
    };
  },
};
