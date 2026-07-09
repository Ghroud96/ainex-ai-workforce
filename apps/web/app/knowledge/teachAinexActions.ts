"use server";

import { revalidatePath } from "next/cache";
import { WORKER_IDS } from "@/lib/enterprise/EnterpriseUserTypes";
import { ingestCompanySource } from "@/lib/knowledge/CompanySourceIngestion";
import type { TeachAinexResult } from "@/lib/knowledge/CompanySourceTypes";
import { extractContent, inferFileType } from "@/lib/knowledge/documentUpload";
import { TeachAinexSessionStore } from "@/lib/knowledge/TeachAinexSessionStore";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";
import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";

// The "upload" Company Source adapter — the one guided path where a
// customer's own document gets read during a demo, separate from the
// manual "Upload Document" form (app/knowledge/actions.ts's
// uploadDocument, untouched) — no department/category picker here, since
// the whole point is that AINEX determines those itself. Called as a
// plain async function from the client wizard, not a <form action>, since
// a File can't travel through FormData's synchronous-only accessor
// pattern the way this feature's caller needs (it wants the analysis
// result back immediately, not a page revalidate). Everything past
// content extraction is the shared, source-agnostic pipeline — see
// lib/knowledge/CompanySourceIngestion.ts.
export async function teachAinexAboutDocument(file: File, displayName: string): Promise<TeachAinexResult> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required.");
  }
  if (typeof displayName !== "string" || displayName.trim().length === 0) {
    throw new Error("A document name is required.");
  }

  const fileType = inferFileType(file);
  const content = await extractContent(file, fileType);

  return ingestCompanySource({
    sourceType: "upload",
    displayName: displayName.trim(),
    content,
    fileType,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
  });
}

// The presenter's "start a fresh demo" safety valve — clears every
// customer upload and the running Demo Session snapshot, since both
// stores are process-global with no per-browser-session isolation (see
// docs/product/hybrid-enterprise-demo.md). Demo Company itself is never
// touched by this or by teachAinexAboutDocument — they only ever write to
// UploadedDocumentStore/TeachAinexSessionStore.
export async function resetTeachAinexSession(): Promise<void> {
  UploadedDocumentStore.clear();
  TeachAinexSessionStore.reset();
  resetCache();
  revalidatePath("/knowledge");
  revalidatePath("/dashboard");
  for (const workerId of WORKER_IDS) {
    revalidatePath(`/workforce/${workerId}`);
  }
}
