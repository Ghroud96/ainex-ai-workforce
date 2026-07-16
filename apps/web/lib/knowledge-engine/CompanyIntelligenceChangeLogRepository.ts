import type { CompanyIntelligenceChange, CompanyIntelligenceEntityType } from "@/lib/knowledge-engine/CompanyIntelligenceChangeTypes";

// Append-only persistence for the Company Intelligence change history —
// never mutates or removes an existing entry. Kept as a separate
// repository from CompanyIntelligenceRepository (not folded into one
// "save everything" method) because the two have different persistence
// shapes: one profile snapshot per company vs. an ever-growing log —
// mirrors lib/sales/SalesDealRepository.ts's precedent for a future
// FirestoreChangeLogRepository. CompanyIntelligenceService is the only
// caller (Capability 11, Phase C10).
export interface CompanyIntelligenceChangeLogRepository {
  append(companyId: string, changes: CompanyIntelligenceChange[]): void;
  getAll(companyId: string): CompanyIntelligenceChange[];
  getForEntity(companyId: string, entityType: CompanyIntelligenceEntityType, entityId: string): CompanyIntelligenceChange[];
}

class InMemoryCompanyIntelligenceChangeLogRepository implements CompanyIntelligenceChangeLogRepository {
  private changesByCompanyId = new Map<string, CompanyIntelligenceChange[]>();

  append(companyId: string, changes: CompanyIntelligenceChange[]): void {
    if (changes.length === 0) return;
    const existing = this.changesByCompanyId.get(companyId) ?? [];
    this.changesByCompanyId.set(companyId, [...existing, ...changes]);
  }

  getAll(companyId: string): CompanyIntelligenceChange[] {
    return [...(this.changesByCompanyId.get(companyId) ?? [])];
  }

  getForEntity(companyId: string, entityType: CompanyIntelligenceEntityType, entityId: string): CompanyIntelligenceChange[] {
    return this.getAll(companyId).filter((change) => change.entityType === entityType && change.entityId === entityId);
  }
}

const GLOBAL_KEY = Symbol.for("ainex.CompanyIntelligenceChangeLogRepository");

type GlobalWithRepository = typeof globalThis & { [GLOBAL_KEY]?: CompanyIntelligenceChangeLogRepository };

const globalWithRepository = globalThis as GlobalWithRepository;

export const CompanyIntelligenceChangeLogRepository: CompanyIntelligenceChangeLogRepository =
  globalWithRepository[GLOBAL_KEY] ?? (globalWithRepository[GLOBAL_KEY] = new InMemoryCompanyIntelligenceChangeLogRepository());
