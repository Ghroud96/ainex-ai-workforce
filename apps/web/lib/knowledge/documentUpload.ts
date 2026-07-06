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
export async function extractContent(file: File, fileType: FileType): Promise<string> {
  if (fileType === "TXT") {
    return file.text();
  }
  return `Real text extraction is not yet implemented for ${fileType} uploads — this document is indexed by its metadata only.`;
}
