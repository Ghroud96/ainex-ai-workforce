import { getAllDocuments, type DigitalDocument } from "@/data/documents";
import type { RetrievalContext, SearchResult } from "@/lib/knowledge/types";

export interface DocumentSearchFilter {
  department?: string;
  category?: string;
}

// Common words filtered out of the query so they can't produce a
// false-positive match just by appearing somewhere in a document's text —
// without this, a query like "What is the weather forecast for
// Antarctica?" would still match documents through "what"/"is"/"the"/"for".
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "and", "or", "but", "if", "then", "than", "so", "to", "of", "in", "on",
  "for", "with", "at", "by", "from", "as", "into", "about", "what", "who",
  "when", "where", "why", "how", "which", "this", "that", "these", "those",
  "it", "its", "do", "does", "did", "can", "could", "will", "would",
  "should", "there", "any", "all", "not", "no",
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

// Plain keyword matching over title, department, category, tags, owner,
// and description ("content") — no vector database, no embeddings. This
// is deliberately simpler than the Phase B4 RetrievalEngine (which scores
// via a mock, meaningless hash-based embedding): now that a real LLM is
// connected, a real relevance signal matters more than a placeholder
// vector similarity. `searchDocuments()` is the seam a future phase
// replaces with Qdrant or PostgreSQL full-text search, without changing
// its signature or return type.
function toSearchResult(document: DigitalDocument, score: number): SearchResult {
  return {
    chunkId: `${document.id}-search`,
    documentId: document.id,
    score,
    content: document.description,
    metadata: {
      title: document.name,
      department: document.department,
      author: document.owner,
      createdDate: document.uploadDate,
      tags: document.tags,
      category: document.category,
      version: document.version,
      status: document.status,
    },
  };
}

function scoreDocument(document: DigitalDocument, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 0;

  // Whole-word matching, not substring — otherwise a short query term like
  // "term" would false-positive match inside an unrelated word like
  // "long-term".
  const haystackWords = new Set(
    tokenize(
      [
        document.name,
        document.department,
        document.category,
        document.owner,
        ...document.tags,
        document.description,
      ].join(" "),
    ),
  );

  const matchedTerms = queryTerms.filter((term) => haystackWords.has(term));
  return matchedTerms.length / queryTerms.length;
}

export function searchDocuments(queryText: string, filter: DocumentSearchFilter = {}): SearchResult[] {
  const queryTerms = tokenize(queryText).filter((term) => !STOPWORDS.has(term));

  return getAllDocuments()
    .filter((document) => !filter.department || document.department === filter.department)
    .filter((document) => !filter.category || document.category === filter.category)
    .map((document) => toSearchResult(document, scoreDocument(document, queryTerms)))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function retrieveKnowledgeContext(
  queryText: string,
  filter: DocumentSearchFilter = {},
): RetrievalContext {
  return {
    query: queryText,
    department: filter.department,
    results: searchDocuments(queryText, filter),
  };
}
