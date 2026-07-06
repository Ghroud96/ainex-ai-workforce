"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "@/data/categories";
import { categories } from "@/data/categories";
import type { Department } from "@/data/departments";
import { departments } from "@/data/departments";
import type { DigitalDocument, FileType } from "@/data/documents";
import { deriveUsedByForDepartment } from "@/lib/company-intelligence/WorkerKnowledgeMap";
import { extractContent, inferFileType } from "@/lib/knowledge/documentUpload";
import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";

function isDepartment(value: FormDataEntryValue | null): value is Department {
  return typeof value === "string" && (departments as readonly string[]).includes(value) && value !== "All Departments";
}

function isCategory(value: FormDataEntryValue | null): value is Category {
  return typeof value === "string" && (categories as readonly string[]).includes(value);
}

export async function uploadDocument(formData: FormData): Promise<void> {
  const file = formData.get("file");
  const name = formData.get("name");
  const department = formData.get("department");
  const category = formData.get("category");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("A file is required to upload a document.");
  }
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("A document name is required.");
  }
  if (!isDepartment(department) || !isCategory(category)) {
    throw new Error("A valid department and category are required.");
  }

  const fileType = inferFileType(file);
  const content = await extractContent(file, fileType);

  const document: DigitalDocument = {
    id: `upload-${crypto.randomUUID()}`,
    name: name.trim(),
    description: content,
    department,
    owner: "You",
    category,
    version: "v1.0",
    uploadDate: new Date().toISOString().slice(0, 10),
    status: "Indexed",
    processingStage: "Available",
    fileType,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    tags: [],
    // Derived from department, not left empty — this is what makes an
    // upload immediately usable Company Intelligence for the relevant
    // Worker(s), with no manual tagging step.
    usedBy: deriveUsedByForDepartment(department),
    workflows: [],
    relatedDocuments: [],
  };

  UploadedDocumentStore.add(document);
  resetCache();
  revalidatePath("/knowledge");
}
