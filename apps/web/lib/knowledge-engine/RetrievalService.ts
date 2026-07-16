import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { WORKER_IDS, type DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { CompanyIntelligenceService } from "@/lib/knowledge-engine/CompanyIntelligenceService";
import type { CompanyIntelligenceProfile, CompanyProfile, TrackedEntityProfile } from "@/lib/knowledge-engine/CompanyIntelligenceTypes";
import { assembleKnowledgeContext } from "@/lib/rag/ContextAssembler";
import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import { RetrievalEngine } from "@/lib/retriever/RetrievalEngine";

type IntelligenceListField =
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

// Which slice of Company Intelligence is relevant to each worker — the
// same department-relevance convention
// lib/company-intelligence/WorkerKnowledgeMap.ts already applies to
// documents (Sales -> products/customers/policies, Finance -> KPIs/
// financial policies/objectives, Executive -> risks/opportunities/
// strategy — Step 8's own examples), applied here to structured
// Company Intelligence list fields instead of document departments.
const WORKER_RELEVANT_FIELDS: Record<DepartmentWorkerId, IntelligenceListField[]> = {
  executive: ["risks", "opportunities", "objectives"],
  sales: ["products", "customers", "policies"],
  finance: ["kpis", "policies", "objectives"],
  inventory: ["products", "suppliers", "processes"],
  hr: ["policies", "processes", "compliance"],
  "customer-support": ["products", "customers", "policies"],
  operations: ["processes", "suppliers", "kpis"],
  marketing: ["products", "customers", "opportunities"],
  procurement: ["suppliers", "products", "processes"],
  compliance: ["compliance", "policies", "risks"],
};

function isDepartmentWorkerId(id: string): id is DepartmentWorkerId {
  return (WORKER_IDS as readonly string[]).includes(id);
}

// The worker-scoped read of Company Intelligence — only the fields
// relevant to this worker's responsibilities, per Step 8 ("every Worker
// should automatically receive only the knowledge relevant to its
// responsibilities"). TrackedFacts keep their lightweight `sources`
// references (provenance is never dropped) but nothing here resolves
// those references into full KnowledgeSource/document metadata — a
// consumer that wants the full evidence trail reads `evidence` below.
export interface WorkerScopedIntelligence {
  company: CompanyProfile;
  fields: Partial<Record<IntelligenceListField, TrackedEntityProfile[]>>;
}

// The single unified entry point Step 7 asks for: Structured Company
// Intelligence + Relevant Evidence, combined without ever sending full
// documents to the LLM. `structured` reads through
// CompanyIntelligenceService (never a repository directly); `evidence`
// delegates to the existing RetrievalEngine/assembleKnowledgeContext —
// no new vector/embedding code (Capability 11, Phase C10).
export const RetrievalService = {
  async forWorker(workerId: string, userMessage = ""): Promise<{ structured: WorkerScopedIntelligence; evidence: KnowledgeContext }> {
    const companyId = CompanyProfileStore.getCurrent().company.profile.id;
    const profile = CompanyIntelligenceService.getProfile(companyId);
    const relevantFields = isDepartmentWorkerId(workerId) ? WORKER_RELEVANT_FIELDS[workerId] : [];

    const fields: Partial<Record<IntelligenceListField, TrackedEntityProfile[]>> = {};
    if (profile) {
      for (const field of relevantFields) {
        fields[field] = profile[field];
      }
    }

    const structured: WorkerScopedIntelligence = {
      company: profile?.company ?? {},
      fields,
    };

    const searchResults = await RetrievalEngine.search(userMessage);
    const evidence = assembleKnowledgeContext(userMessage, searchResults);

    return { structured, evidence };
  },

  // Additive (Capability 12) — the full, unfiltered CompanyIntelligenceProfile
  // for consumers that need to compare across departments/products/
  // customers rather than see one worker's relevant slice. `forWorker()`
  // above is unchanged; this is a new entry point, not a redesign of it.
  // Still reads through CompanyIntelligenceService (never a repository
  // directly) and reuses the same evidence-search logic — no consumer of
  // Company Intelligence bypasses this service.
  async forExecutive(userMessage = ""): Promise<{ structured: CompanyIntelligenceProfile; evidence: KnowledgeContext }> {
    const companyId = CompanyProfileStore.getCurrent().company.profile.id;
    const profile = CompanyIntelligenceService.getProfile(companyId);

    const structured: CompanyIntelligenceProfile = profile ?? {
      companyId,
      version: 0,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      company: {},
      departments: [],
      products: [],
      services: [],
      customers: [],
      suppliers: [],
      policies: [],
      processes: [],
      risks: [],
      opportunities: [],
      objectives: [],
      kpis: [],
      compliance: [],
      importantDates: [],
      glossary: [],
      keyPeople: [],
      contacts: [],
    };

    const searchResults = await RetrievalEngine.search(userMessage);
    const evidence = assembleKnowledgeContext(userMessage, searchResults);

    return { structured, evidence };
  },
};
