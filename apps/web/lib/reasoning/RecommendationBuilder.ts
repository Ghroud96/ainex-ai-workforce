import { buildActionItems } from "@/lib/reasoning/ActionRecommendation";
import { deriveOverallPriority } from "@/lib/reasoning/DecisionTree";
import type {
  ConfidenceScore,
  ExecutiveSummary,
  ReasoningFinding,
  ReasoningResult,
} from "@/lib/reasoning/ReasoningTypes";

function buildExecutiveSummary(
  workerName: string,
  findings: ReasoningFinding[],
  confidence: ConfidenceScore,
): ExecutiveSummary {
  const riskCount = findings.filter((finding) => finding.category === "risk").length;
  const opportunityCount = findings.filter((finding) => finding.category === "opportunity").length;

  const headline =
    riskCount > 0
      ? `${workerName} flagged ${riskCount} risk${riskCount === 1 ? "" : "s"} needing attention.`
      : `${workerName} found no immediate risks for this request.`;

  const narrative = [
    headline,
    opportunityCount > 0
      ? `${opportunityCount} opportunit${opportunityCount === 1 ? "y" : "ies"} identified.`
      : null,
    `Confidence: ${confidence.label} (${confidence.value}). ${confidence.basis}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join(" ");

  return { headline, narrative, keyFindingIds: findings.map((finding) => finding.id) };
}

function buildFollowUps(findings: ReasoningFinding[]): string[] {
  const followUps: string[] = [];

  if (findings.some((finding) => finding.title === "No supporting knowledge found")) {
    followUps.push("Upload or index a document that directly answers this question in the Knowledge Hub.");
  }

  if (findings.some((finding) => finding.category === "anomaly")) {
    followUps.push("Review the Knowledge Hub for duplicate or overlapping documents.");
  }

  if (followUps.length === 0) {
    followUps.push("No follow-up action required at this time.");
  }

  return followUps;
}

// Assembles everything RiskAnalyzer, DecisionTree, and ConfidenceScore
// produced into the final structured result a caller displays or logs.
export function buildRecommendation(
  workerId: string,
  workerName: string,
  findings: ReasoningFinding[],
  confidence: ConfidenceScore,
): ReasoningResult {
  return {
    workerId,
    confidence,
    overallPriority: deriveOverallPriority(findings),
    findings,
    actions: buildActionItems(findings),
    followUps: buildFollowUps(findings),
    executiveSummary: buildExecutiveSummary(workerName, findings, confidence),
    generatedAt: new Date().toISOString(),
  };
}
