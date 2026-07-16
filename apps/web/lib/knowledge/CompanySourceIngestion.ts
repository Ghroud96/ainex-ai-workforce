import { revalidatePath } from "next/cache";
import type { DigitalDocument } from "@/data/documents";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { WORKER_DOCUMENT_DEPARTMENTS, deriveUsedByForDepartment } from "@/lib/company-intelligence/WorkerKnowledgeMap";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import type { DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { CompanyIntelligenceService } from "@/lib/knowledge-engine/CompanyIntelligenceService";
import { extractKnowledge } from "@/lib/knowledge-engine/KnowledgeExtractionService";
import { KnowledgeJobStore } from "@/lib/knowledge-engine/KnowledgeJobStore";
import { KnowledgeSourceStore } from "@/lib/knowledge-engine/KnowledgeSourceStore";
import type { CompanySourceInput, TeachAinexResult } from "@/lib/knowledge/CompanySourceTypes";
import { TeachAinexSessionStore } from "@/lib/knowledge/TeachAinexSessionStore";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";
import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";

// Company Source → Ingestion Pipeline → Knowledge Extraction → Company
// Intelligence → WorkerKnowledgeMap → Digital Workforce. This is the one
// reusable seam every Company Source adapter goes through — today
// that's exactly one adapter (app/knowledge/teachAinexActions.ts's
// browser-file upload); a future Drive/SharePoint/CRM/ERP/Shopify/email/
// database connector would turn its own content into a CompanySourceInput
// and call this same function, with no new classification, storage, or
// worker-linking logic. See docs/product/hybrid-enterprise-demo.md and
// docs/architecture/company-intelligence-engine.md.
export async function ingestCompanySource(input: CompanySourceInput): Promise<TeachAinexResult> {
  // A neutral placeholder shape only — immediately overwritten below by
  // the AI's own suggested department/category. extractKnowledge() needs
  // a real DigitalDocument to reason over, not a bag of loose fields.
  const placeholder: DigitalDocument = {
    id: `source-${crypto.randomUUID()}`,
    name: input.displayName,
    description: input.content,
    department: "Operations",
    owner: "You",
    category: "SOP",
    version: "v1.0",
    uploadDate: new Date().toISOString().slice(0, 10),
    status: "Indexed",
    processingStage: "Available",
    fileType: input.fileType,
    sizeKb: input.sizeKb,
    tags: [],
    usedBy: [],
    workflows: [],
    relatedDocuments: [],
    source: "customer-upload",
  };

  const companyId = CompanyProfileStore.getCurrent().company.profile.id;
  const now = new Date().toISOString();

  KnowledgeSourceStore.register({
    sourceId: placeholder.id,
    sourceType: "document",
    sourceName: placeholder.name,
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: now,
  });

  const jobId = `job-${crypto.randomUUID()}`;
  KnowledgeJobStore.create({ id: jobId, companyId, documentId: placeholder.id, status: "queued", createdAt: now });

  let extract;
  try {
    KnowledgeJobStore.update(jobId, { status: "processing", startedAt: new Date().toISOString() });
    extract = await extractKnowledge(placeholder);
    KnowledgeJobStore.update(jobId, { status: "completed", completedAt: new Date().toISOString() });
  } catch (error) {
    KnowledgeJobStore.update(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown extraction error.",
    });
    throw error;
  }

  const intelligence = extract.legacy;

  const usedBy = deriveUsedByForDepartment(intelligence.suggestedDepartment);
  const workerSlugs = (Object.keys(WORKER_DOCUMENT_DEPARTMENTS) as DepartmentWorkerId[]).filter((workerId) =>
    WORKER_DOCUMENT_DEPARTMENTS[workerId].includes(intelligence.suggestedDepartment),
  );
  const workersNowTrained = workerSlugs.map((slug) => ({ slug, name: WORKER_NAMES_BY_ID[slug] ?? slug }));

  const document: DigitalDocument = {
    ...placeholder,
    department: intelligence.suggestedDepartment,
    category: intelligence.suggestedCategory,
    tags: intelligence.knowledgeTags,
    usedBy,
  };

  UploadedDocumentStore.add(document);

  // The Company Intelligence Builder merges this document's extraction
  // into the persisted profile — incremental, never a replace.
  CompanyIntelligenceService.applyExtraction(companyId, extract);

  TeachAinexSessionStore.recordUpload();
  if (intelligence.source === "Live AI") {
    TeachAinexSessionStore.recordLiveAiCall();
  }
  TeachAinexSessionStore.recordWorkersUpdated(workerSlugs);

  resetCache();
  revalidatePath("/knowledge");
  revalidatePath("/dashboard");
  for (const slug of workerSlugs) {
    revalidatePath(`/workforce/${slug}`);
  }

  return {
    document,
    intelligence,
    workersNowTrained,
    sessionSnapshot: TeachAinexSessionStore.snapshot(),
  };
}
