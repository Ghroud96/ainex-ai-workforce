import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { FileType } from "@/data/documents";

// Shared by both app/knowledge/actions.ts's manual upload form and
// app/knowledge/teachAinexActions.ts's guided flow — kept out of either
// "use server" actions file since Next.js requires every export from a
// "use server" file to be an async function, and inferFileType is
// synchronous.
export function inferFileType(file: File): FileType {
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
    case "md":
    case "markdown":
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

// Real text extraction (Phase C10 — Enterprise Knowledge Engine): PDF via
// pdf-parse, DOCX via mammoth, both new dependencies recorded in
// ARCHITECTURE.md. Falls back to an honest empty-content note rather than
// throwing — a scanned/image-only PDF or a corrupt file should yield a
// low-confidence extraction downstream, not a failed upload.
async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim() || "No extractable text was found in this PDF (it may be scanned or image-only).";
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim() || "No extractable text was found in this document.";
}

// The place a real upload becomes real content. TXT/Markdown read
// directly as text; PDF and DOCX/DOC now extract real text (Phase C10).
// Every other file type (XLSX, CSV, PPTX, Image) keeps the honest
// placeholder — different parsing concerns, out of scope here — matching
// this codebase's consistent honesty-labeling convention (see e.g.
// app/integrations/page.tsx, app/dashboard/page.tsx).
export async function extractContent(file: File, fileType: FileType): Promise<string> {
  if (fileType === "TXT") {
    return file.text();
  }

  if (fileType === "PDF") {
    return extractPdfText(Buffer.from(await file.arrayBuffer()));
  }

  if (fileType === "DOCX" || fileType === "DOC") {
    return extractDocxText(Buffer.from(await file.arrayBuffer()));
  }

  return `Real text extraction is not yet implemented for ${fileType} uploads — this document is indexed by its metadata only.`;
}
