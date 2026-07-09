import { revalidatePath } from "next/cache";
import type { DigitalDocument } from "@/data/documents";
import { WORKER_DOCUMENT_DEPARTMENTS, deriveUsedByForDepartment } from "@/lib/company-intelligence/WorkerKnowledgeMap";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import type { DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import type { CompanySourceInput, TeachAinexResult } from "@/lib/knowledge/CompanySourceTypes";
import { TeachAinexSessionStore } from "@/lib/knowledge/TeachAinexSessionStore";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";
import { summarizeDocument } from "@/lib/services/knowledge/DocumentIntelligenceService";
import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";

// Company Source → Ingestion Pipeline → Company Intelligence →
// WorkerKnowledgeMap → Digital Workforce. This is the one reusable seam
// every Company Source adapter goes through — today that's exactly one
// adapter (app/knowledge/teachAinexActions.ts's browser-file upload); a
// future Drive/SharePoint/CRM/ERP/Shopify/email/database connector would
// turn its own content into a CompanySourceInput and call this same
// function, with no new classification, storage, or worker-linking logic.
// See docs/product/hybrid-enterprise-demo.md.
export async function ingestCompanySource(input: CompanySourceInput): Promise<TeachAinexResult> {
  // A neutral placeholder shape only — immediately overwritten below by
  // the AI's own suggested department/category. summarizeDocument() needs
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

  const intelligence = await summarizeDocument(placeholder);

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
