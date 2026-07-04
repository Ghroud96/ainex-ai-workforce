import { getParserFor } from "@/lib/parser/parsers";
import type { ParsedDocument } from "@/lib/parser/types";
import type { Document } from "@/lib/knowledge/types";

export const ParserService = {
  parse(document: Document): ParsedDocument {
    const parser = getParserFor(document.fileType);

    if (!parser) {
      throw new Error(`No parser registered for file type: ${document.fileType}`);
    }

    return parser.parse(document);
  },
};
