import type { ContextBudget, RankedSource } from "@/lib/rag/RAGTypes";

// Configurable per call — callers needing a smaller or larger context
// window (e.g. a future provider with a small context limit) pass their
// own budget instead of this default.
export const DEFAULT_CONTEXT_BUDGET: ContextBudget = { maxCharacters: 4000 };

export interface BudgetResult {
  included: RankedSource[];
  excluded: RankedSource[];
  charactersUsed: number;
}

export function applyBudget(sources: RankedSource[], budget: ContextBudget = DEFAULT_CONTEXT_BUDGET): BudgetResult {
  const included: RankedSource[] = [];
  const excluded: RankedSource[] = [];
  let charactersUsed = 0;

  for (const source of sources) {
    const length = source.result.content.length;

    if (charactersUsed + length <= budget.maxCharacters) {
      included.push(source);
      charactersUsed += length;
    } else {
      excluded.push(source);
    }
  }

  return { included, excluded, charactersUsed };
}
