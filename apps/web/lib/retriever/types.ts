import type { RetrievalContext, SearchResult } from "@/lib/knowledge/types";

export interface RetrievalFilter {
  department?: string;
  category?: string;
}

export interface Retriever {
  search(query: string, filter?: RetrievalFilter): Promise<SearchResult[]>;
  retrieve(query: string, filter?: RetrievalFilter): Promise<RetrievalContext>;
  rerank(results: SearchResult[]): SearchResult[];
  filter(results: SearchResult[], criteria: RetrievalFilter): SearchResult[];
}
