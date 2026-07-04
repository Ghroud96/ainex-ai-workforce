import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import { priorityFromLevel } from "@/lib/reasoning/BusinessPriority";
import type { ReasoningFinding } from "@/lib/reasoning/ReasoningTypes";

let findingCounter = 0;
function nextId(prefix: string): string {
  findingCounter += 1;
  return `${prefix}-${findingCounter}`;
}

// Deterministic, rule-based business reasoning over the RAG pipeline's
// actual structured output — not Chain-of-Thought, and no LLM call.
export function analyzeRisks(context: KnowledgeContext): ReasoningFinding[] {
  const findings: ReasoningFinding[] = [];

  if (context.included.length === 0) {
    findings.push({
      id: nextId("risk"),
      category: "risk",
      title: "No supporting knowledge found",
      description: `No Knowledge Hub document answered "${context.query}" — this response may rely on general reasoning rather than company-specific evidence.`,
      priority: priorityFromLevel("High"),
      relatedDocumentIds: [],
    });
  }

  if (context.excluded.length > 0) {
    findings.push({
      id: nextId("risk"),
      category: "risk",
      title: "Context budget exceeded",
      description: `${context.excluded.length} relevant source${context.excluded.length === 1 ? "" : "s"} did not fit within the ${context.budget.maxCharacters}-character context budget and were excluded.`,
      priority: priorityFromLevel("Medium"),
      relatedDocumentIds: context.excluded.map((source) => source.result.documentId),
    });
  }

  return findings;
}

export function detectOpportunities(context: KnowledgeContext): ReasoningFinding[] {
  const opportunities: ReasoningFinding[] = [];

  if (context.included.length > 1) {
    opportunities.push({
      id: nextId("opportunity"),
      category: "opportunity",
      title: "Multiple corroborating sources",
      description: `${context.included.length} knowledge sources support this response, giving higher confidence for a decisive recommendation.`,
      priority: priorityFromLevel("Low"),
      relatedDocumentIds: context.included.map((source) => source.result.documentId),
    });
  }

  return opportunities;
}

export function detectAnomalies(context: KnowledgeContext): ReasoningFinding[] {
  const anomalies: ReasoningFinding[] = [];
  const mergedSources = context.included.filter((source) => source.mergedFrom > 1);

  if (mergedSources.length > 0) {
    anomalies.push({
      id: nextId("anomaly"),
      category: "anomaly",
      title: "Overlapping knowledge chunks merged",
      description: `${mergedSources.length} document${mergedSources.length === 1 ? "" : "s"} had multiple overlapping chunks merged into one context entry — verify the source document isn't duplicated in the Knowledge Hub.`,
      priority: priorityFromLevel("Low"),
      relatedDocumentIds: mergedSources.map((source) => source.result.documentId),
    });
  }

  return anomalies;
}
