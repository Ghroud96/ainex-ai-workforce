import { computeConfidence } from "@/lib/reasoning/ConfidenceScore";
import { buildRecommendation } from "@/lib/reasoning/RecommendationBuilder";
import type { ReasoningResult } from "@/lib/reasoning/ReasoningTypes";
import { analyzeRisks, detectAnomalies, detectOpportunities } from "@/lib/reasoning/RiskAnalyzer";
import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";
import type { WorkerContext } from "@/lib/workforce/WorkerContext";

export interface ReasoningInput {
  worker: WorkerInstance;
  workerContext: WorkerContext;
  knowledgeContext: KnowledgeContext;
}

export interface ReasoningStrategy {
  id: string;
  name: string;
  run(input: ReasoningInput): ReasoningResult;
}

// The generic strategy every worker uses today. A future worker-type-
// specific strategy (e.g. a stricter Finance risk model that also reads
// input.workerContext.businessKpis) implements the same interface and
// registers alongside this one via ReasoningEngine.registerStrategy().
export const defaultReasoningStrategy: ReasoningStrategy = {
  id: "default",
  name: "Default Business Reasoning",
  run(input) {
    const findings = [
      ...analyzeRisks(input.knowledgeContext),
      ...detectOpportunities(input.knowledgeContext),
      ...detectAnomalies(input.knowledgeContext),
    ];
    const confidence = computeConfidence(input.knowledgeContext);

    return buildRecommendation(input.worker.id, input.worker.name, findings, confidence);
  },
};
