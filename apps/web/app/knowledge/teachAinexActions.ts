"use server";

import { revalidatePath } from "next/cache";
import type { DigitalDocument } from "@/data/documents";
import { WORKER_DOCUMENT_DEPARTMENTS, deriveUsedByForDepartment } from "@/lib/company-intelligence/WorkerKnowledgeMap";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import type { DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { extractContent, inferFileType } from "@/lib/knowledge/documentUpload";
import { TeachAinexSessionStore, type TeachAinexSessionSnapshot } from "@/lib/knowledge/TeachAinexSessionStore";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";
import { summarizeDocument, type DocumentIntelligence } from "@/lib/services/knowledge/DocumentIntelligenceService";
import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";

export interface TrainedWorker {
  slug: string;
  name: string;
}

export interface TeachAinexResult {
  document: DigitalDocument;
  intelligence: DocumentIntelligence;
  workersNowTrained: TrainedWorker[];
  sessionSnapshot: TeachAinexSessionSnapshot;
}

// The one guided path where a customer's own document gets a forced-live
// AI read during a demo, separate from the manual "Upload Document" form
// (app/knowledge/actions.ts's uploadDocument, untouched) — no department/
// category picker here, since the whole point is that AINEX determines
// those itself. Called as a plain async function from the client wizard,
// not a <form action>, since a File can't travel through FormData's
// synchronous-only accessor pattern the way this feature's caller needs
// (it wants the analysis result back immediately, not a page revalidate).
export async function teachAinexAboutDocument(file: File, displayName: string): Promise<TeachAinexResult> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }
  if (typeof displayName !== "string" || displayName.trim().length === 0) {
    throw new Error("A document name is required.");
  }

  const fileType = inferFileType(file);
  const content = await extractContent(file, fileType);

  // A neutral placeholder shape only — immediately overwritten below by
  // the AI's own suggested department/category. summarizeDocument() needs
  // a real DigitalDocument to reason over, not a bag of loose fields.
  const placeholder: DigitalDocument = {
    id: `teach-${crypto.randomUUID()}`,
    name: displayName.trim(),
    description: content,
    department: "Operations",
    owner: "You",
    category: "SOP",
    version: "v1.0",
    uploadDate: new Date().toISOString().slice(0, 10),
    status: "Indexed",
    processingStage: "Available",
    fileType,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    tags: [],
    usedBy: [],
    workflows: [],
    relatedDocuments: [],
  };

  // The one call site in the whole codebase that ever forces Live AI
  // regardless of the global Settings toggle — see ProviderContext.ts's
  // forceLiveAi field and OpenAIProvider.ts's gate.
  const intelligence = await summarizeDocument(placeholder, { forceLiveAi: true });

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
