import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import type { ConfidenceScore } from "@/lib/reasoning/ReasoningTypes";

// Reuses the relevance scores the Retrieval Engine already computed
// (via cosine similarity) rather than recomputing anything — confidence
// here is a business-level read of an existing number, not a new model.
export function computeConfidence(knowledgeContext: KnowledgeContext): ConfidenceScore {
  const sourceCount = knowledgeContext.included.length;

  if (sourceCount === 0) {
    return {
      value: 0.1,
      label: "Low",
      basis: "No knowledge sources were retrieved for this request.",
    };
  }

  const averageScore =
    knowledgeContext.included.reduce((sum, source) => sum + source.result.score, 0) / sourceCount;
  const value = Number(Math.min(1, Math.max(0, averageScore)).toFixed(2));
  const label: ConfidenceScore["label"] = value >= 0.7 ? "High" : value >= 0.4 ? "Medium" : "Low";

  return {
    value,
    label,
    basis: `Derived from ${sourceCount} retrieved source${sourceCount === 1 ? "" : "s"} with an average relevance score of ${value}.`,
  };
}
