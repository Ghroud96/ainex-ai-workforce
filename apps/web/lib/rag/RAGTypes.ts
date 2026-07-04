import type { SearchResult } from "@/lib/knowledge/types";

export interface RankedSource {
  result: SearchResult;
  rank: number;
  // How many chunks were combined into this entry. 1 means no merge.
  mergedFrom: number;
}

export interface Citation {
  label: string;
  documentId: string;
  title: string;
  department: string;
}

export interface ContextBudget {
  maxCharacters: number;
}

export interface KnowledgeContext {
  query: string;
  included: RankedSource[];
  excluded: RankedSource[];
  citations: Citation[];
  budget: ContextBudget;
  charactersUsed: number;
}
