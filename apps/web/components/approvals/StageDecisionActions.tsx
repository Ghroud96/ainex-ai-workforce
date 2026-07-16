"use client";

import { useActionState } from "react";
import type { ApprovalDecisionState } from "@/lib/approvals/ApprovalTypes";

const initialState: ApprovalDecisionState = { error: null };

type ButtonVariant = "primary" | "neutral" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  neutral: "border border-slate-200/70 bg-white text-slate-700 hover:bg-slate-50",
  destructive: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export interface StageDecisionButton<TOutcome extends string> {
  outcome: TOutcome;
  label: string;
  variant: ButtonVariant;
}

// The one reusable approval-decision button row — every future workflow
// (Finance, HR, Inventory, Procurement, Executive, Marketing) renders the
// same button styling and the same friendly stale-stage message just by
// supplying its own `action` (from createStageDecisionAction) and
// `buttons` config. See docs/architecture/approval-workflow-engine.md.
export default function StageDecisionActions<TOutcome extends string>({
  entityId,
  action,
  buttons,
}: {
  entityId: string;
  action: (prevState: ApprovalDecisionState, formData: FormData) => Promise<ApprovalDecisionState>;
  buttons: StageDecisionButton<TOutcome>[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {buttons.map((button) => (
        <form key={button.outcome} action={formAction}>
          <input type="hidden" name="id" value={entityId} />
          <input type="hidden" name="outcome" value={button.outcome} />
          <button
            type="submit"
            disabled={pending}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[button.variant]}`}
          >
            {button.label}
          </button>
        </form>
      ))}
      {state.error && <p className="w-full text-xs text-amber-700">{state.error}</p>}
    </div>
  );
}
