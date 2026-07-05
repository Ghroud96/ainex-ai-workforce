"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "@/data/categories";
import { categories } from "@/data/categories";
import type { Department } from "@/data/departments";
import { departments } from "@/data/departments";
import type { DigitalDocument, FileType } from "@/data/documents";
import { resetCache } from "@/lib/services/knowledge/knowledgeHubBridge";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";

function isDepartment(value: FormDataEntryValue | null): value is Department {
  return typeof value === "string" && (departments as readonly string[]).includes(value) && value !== "All Departments";
}

function isCategory(value: FormDataEntryValue | null): value is Category {
  return typeof value === "string" && (categories as readonly string[]).includes(value);
}

function inferFileType(file: File): FileType {
  const extension = file.name.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "pdf":
      return "PDF";
    case "docx":
      return "DOCX";
    case "doc":
      return "DOC";
    case "xlsx":
      return "XLSX";
    case "csv":
      return "CSV";
    case "txt":
      return "TXT";
    case "pptx":
      return "PPTX";
    case "png":
    case "jpg":
    case "jpeg":
      return "Image";
    default:
      return "TXT";
  }
}

// The one place a real upload becomes real content: a .txt file's actual
// text is read directly (Document.content, consumed by lib/parser/parsers.ts,
// already uses this verbatim when present — no parser change needed). Every
// other file type gets an honest placeholder instead of pretending to have
// extracted it, matching this codebase's consistent honesty-labeling
// convention (see e.g. app/integrations/page.tsx, app/dashboard/page.tsx).
async function extractContent(file: File, fileType: FileType): Promise<string> {
  if (fileType === "TXT") {
    return file.text();
  }
  return `Real text extraction is not yet implemented for ${fileType} uploads — this document is indexed by its metadata only.`;
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
    usedBy: [],
    workflows: [],
    relatedDocuments: [],
  };

  UploadedDocumentStore.add(document);
  resetCache();
  revalidatePath("/knowledge");
}
