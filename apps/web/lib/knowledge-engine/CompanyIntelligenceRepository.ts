import type { CompanyIntelligenceProfile } from "@/lib/knowledge-engine/CompanyIntelligenceTypes";

// Persistence only — get/save, nothing else. CompanyIntelligenceBuilder
// owns merge and change-detection rules; CompanyIntelligenceService is
// the only caller of this repository (Capability 11, Phase C10 — see
// its Architectural Principle). Every method is company-scoped by
// interface from the start, matching lib/sales/SalesDealRepository.ts's
// own precedent for a future FirestoreCompanyIntelligenceRepository — no
// real Firestore/GCP is provisioned; today's implementation is
// single-company in practice (the current demo company's real
// GeneratedCompanyProfile.id), keyed by companyId so the interface never
// needs a breaking change when AINEX becomes multi-company.
export interface CompanyIntelligenceRepository {
  get(companyId: string): CompanyIntelligenceProfile | undefined;
  save(companyId: string, profile: CompanyIntelligenceProfile): void;
}

class InMemoryCompanyIntelligenceRepository implements CompanyIntelligenceRepository {
  private profilesByCompanyId = new Map<string, CompanyIntelligenceProfile>();

  get(companyId: string): CompanyIntelligenceProfile | undefined {
    return this.profilesByCompanyId.get(companyId);
  }

  save(companyId: string, profile: CompanyIntelligenceProfile): void {
    this.profilesByCompanyId.set(companyId, profile);
  }
}

const GLOBAL_KEY = Symbol.for("ainex.CompanyIntelligenceRepository");

type GlobalWithRepository = typeof globalThis & { [GLOBAL_KEY]?: CompanyIntelligenceRepository };

const globalWithRepository = globalThis as GlobalWithRepository;

export const CompanyIntelligenceRepository: CompanyIntelligenceRepository =
  globalWithRepository[GLOBAL_KEY] ?? (globalWithRepository[GLOBAL_KEY] = new InMemoryCompanyIntelligenceRepository());
