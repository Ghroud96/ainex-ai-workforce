import type { Document, SourceFileType } from "@/lib/knowledge/types";
import type { DocumentParser, ParsedDocument } from "@/lib/parser/types";

function mockParse(document: Document, note: string): ParsedDocument {
  // Real file parsing (Phase 2) will extract this from the uploaded
  // file's bytes. Until then, use the document's real text if the
  // caller supplied one (e.g. a Knowledge Hub mock document's
  // description) instead of a placeholder that carries no actual
  // content for chunking/embedding to work with.
  const text = document.content ?? `[${note}] ${document.metadata.title} — parsed content placeholder.`;

  return {
    documentId: document.id,
    text,
    pageCount: 1,
  };
}

export const pdfParser: DocumentParser = {
  supports: ["PDF"],
  parse: (document) => mockParse(document, "PDF parser placeholder"),
};

export const docxParser: DocumentParser = {
  supports: ["DOCX"],
  parse: (document) => mockParse(document, "DOCX parser placeholder"),
};

export const txtParser: DocumentParser = {
  supports: ["TXT"],
  parse: (document) => mockParse(document, "TXT parser placeholder"),
};

export const csvParser: DocumentParser = {
  supports: ["CSV"],
  parse: (document) => mockParse(document, "CSV parser placeholder"),
};

export const excelParser: DocumentParser = {
  supports: ["Excel"],
  parse: (document) => mockParse(document, "Excel parser placeholder"),
};

export const imageOcrParser: DocumentParser = {
  supports: ["Image"],
  parse: (document) => mockParse(document, "Image OCR placeholder — not implemented"),
};

export const parsers: DocumentParser[] = [
  pdfParser,
  docxParser,
  txtParser,
  csvParser,
  excelParser,
  imageOcrParser,
];

export function getParserFor(fileType: SourceFileType): DocumentParser | undefined {
  return parsers.find((parser) => parser.supports.includes(fileType));
}
