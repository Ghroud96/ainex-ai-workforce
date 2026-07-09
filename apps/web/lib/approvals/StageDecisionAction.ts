import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import {
  DEFAULT_APPROVAL_MESSAGES,
  type ApprovalDecisionState,
  type StageDecisionConfig,
} from "@/lib/approvals/ApprovalTypes";

// The one reusable "approve/reject/request revision at a specific stage"
// server action shape — every future workflow (Finance, HR, Inventory,
// Procurement, Executive, Marketing) gets stage gating, authorization,
// friendly (non-throwing) errors, and revalidation by supplying only its
// own entity/stage plumbing. See docs/architecture/approval-workflow-engine.md
// for why this returns state instead of throwing, and why the returned
// function's type stays TEntity/TStage/TOutcome-free — that's what lets any
// domain's action bind directly into useActionState via
// components/approvals/StageDecisionActions.tsx without leaking generics.
//
// This must be called from inside a "use server" file — the factory itself
// is plain server-only code; the function it returns is what becomes the
// actual Server Action once assigned to an export in that file.
export function createStageDecisionAction<TEntity, TStage extends string, TOutcome extends string>(
  config: StageDecisionConfig<TEntity, TStage, TOutcome>,
): (prevState: ApprovalDecisionState, formData: FormData) => Promise<ApprovalDecisionState> {
  const messages = { ...DEFAULT_APPROVAL_MESSAGES, ...config.messages };

  return async function stageDecisionAction(
    _prevState: ApprovalDecisionState,
    formData: FormData,
  ): Promise<ApprovalDecisionState> {
    const id = formData.get("id");
    const outcome = formData.get("outcome") as TOutcome | null;
    if (typeof id !== "string" || !outcome || !(outcome in config.outcomeToStage)) {
      return { error: messages.invalidRequest };
    }

    const entity = config.getEntity(id);
    if (!entity) return { error: messages.notFound };

    const { company } = CompanyProfileStore.getCurrent();
    const currentUser = resolveCurrentUser(company);

    if (!config.isAuthorized(currentUser, entity)) {
      return { error: messages.unauthorized };
    }

    if (config.getStage(entity) !== config.requiredStage) {
      // The entity moved on since this panel was rendered (double-submit, a
      // second tab, another approver). Revalidate so the stale buttons
      // disappear instead of leaving the user stuck on old state.
      config.revalidate();
      return { error: messages.staleStage };
    }

    config.advance(id, config.outcomeToStage[outcome], config.buildNote(outcome, currentUser));
    config.revalidate();
    return { error: null };
  };
}
