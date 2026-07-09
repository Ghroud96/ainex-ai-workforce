import type { DigitalDocument } from "@/data/documents";
import { KnowledgeReferenceStore } from "@/lib/company-intelligence/KnowledgeReferenceStore";

// The business-facing "is this document doing its job yet" view — a
// document-level, persistent concept distinct from the technical
// seven-stage processingStage pipeline (see docs/architecture/
// knowledge-pipeline.md) and from the Teach AINEX wizard's one-time
// upload flow (that stepper ends when the wizard closes; this one keeps
// going after). "Archived" is real, reachable data today (see
// data/documents.ts's DocumentStatusValue), not a future stub.
export const KNOWLEDGE_LIFECYCLE_STAGES = [
  "Uploading",
  "Analyzing",
  "Indexed",
  "Available to Workers",
  "Referenced by AI",
  "Archived",
] as const;

// Any persisted DigitalDocument has already passed "Uploading"/"Analyzing"
// by the time it exists to be queried — those two stages only apply to
// the in-flight wizard, not a stored document. So the lowest reachable
// index here is 2 ("Indexed").
export function getKnowledgeLifecycleIndex(document: DigitalDocument): number {
  if (document.status === "Archived") return 5;
  if (KnowledgeReferenceStore.hasBeenReferenced(document.id)) return 4;
  if (document.usedBy.length > 0) return 3;
  return 2;
}

export function getKnowledgeLifecycleLabel(document: DigitalDocument): string {
  return KNOWLEDGE_LIFECYCLE_STAGES[getKnowledgeLifecycleIndex(document)];
}
