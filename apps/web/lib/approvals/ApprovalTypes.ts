import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";

// The useActionState state shape every stage-decision action returns —
// domain-agnostic on purpose so components/approvals/StageDecisionActions.tsx
// can bind to any of them without knowing the entity/stage/outcome types
// behind a given action. See docs/architecture/approval-workflow-engine.md.
export interface ApprovalDecisionState {
  error: string | null;
}

export interface ApprovalMessages {
  invalidRequest: string;
  notFound: string;
  unauthorized: string;
  staleStage: string;
}

export const DEFAULT_APPROVAL_MESSAGES: ApprovalMessages = {
  invalidRequest: "A decision is required.",
  notFound: "This item could not be found.",
  unauthorized: "You do not have permission to execute this Digital Worker.",
  staleStage: "This workflow step is no longer waiting for this action.",
};

// Everything a domain (Sales, Finance, HR, ...) supplies to
// createStageDecisionAction() to get a fully-formed useActionState action —
// stage gating, authorization, friendly errors, and revalidation included.
export interface StageDecisionConfig<TEntity, TStage extends string, TOutcome extends string> {
  // The one stage this decision is valid from — e.g. "pending-manager-approval".
  requiredStage: TStage;
  outcomeToStage: Record<TOutcome, TStage>;
  getEntity: (id: string) => TEntity | undefined;
  getStage: (entity: TEntity) => TStage;
  isAuthorized: (user: EnterpriseUser, entity: TEntity) => boolean;
  advance: (id: string, nextStage: TStage, note: string) => void;
  buildNote: (outcome: TOutcome, user: EnterpriseUser) => string;
  // Called after every outcome that changes what the page should show:
  // both a successful decision and a stale-stage rejection (so stale
  // buttons disappear on the next render either way).
  revalidate: () => void;
  messages?: Partial<ApprovalMessages>;
}
