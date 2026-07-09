import { advanceDeal, financeDecision, managerDecision, runDealAi } from "@/app/workforce/dealActions";
import StageDecisionActions from "@/components/approvals/StageDecisionActions";
import DealStageStepper from "@/components/DealStageStepper";
import TagBadge from "@/components/TagBadge";
import { getTouchpointLabel } from "@/lib/sales/DealAiService";
import { STAGE_CONFIG, type SalesDeal } from "@/lib/sales/SalesDealTypes";

const STAGE_TONE: Record<string, string> = {
  confirmed: "bg-green-500/10 text-green-400",
  rejected: "bg-red-500/10 text-red-400",
  "pending-manager-approval": "bg-amber-500/10 text-amber-400",
  "pending-finance-review": "bg-amber-500/10 text-amber-400",
  "revision-requested": "bg-amber-500/10 text-amber-400",
};

// The one reusable step-UI component for the whole connected workflow —
// driven entirely by DealStage/STAGE_CONFIG data, not one component per
// stage. Renders exactly what the demo needs to be legible: Current Step,
// Responsible Person, Current Status, Run AI, Approve/Reject/Request
// Revision (only at the two approval gates), Next Step.
export default function WorkflowStepPanel({
  deal,
  customerName,
  ownerName,
  canAct,
}: {
  deal: SalesDeal;
  customerName: string;
  ownerName: string;
  canAct: boolean;
}) {
  const stageConfig = STAGE_CONFIG[deal.stage];
  const responsiblePerson =
    stageConfig.responsibleRole === "Sales Rep"
      ? ownerName
      : stageConfig.responsibleRole === "Sales Manager"
        ? "Sales Manager"
        : stageConfig.responsibleRole === "Finance"
          ? "Finance"
          : "—";
  const result = stageConfig.touchpointId ? deal.aiResults[stageConfig.touchpointId] : undefined;

  return (
    <div className="rounded-xl bg-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{customerName}</p>
          <p className="mt-1 text-xs text-slate-500">Deal value: {deal.estimatedValue.toLocaleString()} · Last interaction: {deal.lastInteraction}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STAGE_TONE[deal.stage] ?? "bg-slate-800 text-slate-300"}`}
        >
          {stageConfig.label}
        </span>
      </div>

      <div className="mt-4">
        <DealStageStepper stage={deal.stage} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TagBadge label={`Current Step: ${stageConfig.label}`} />
        <TagBadge label={`Responsible: ${responsiblePerson}`} />
      </div>

      {result && (
        <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {getTouchpointLabel(result.touchpointId)}
            </p>
            <p className="mt-1 text-sm text-slate-300">{result.aiAnalysis}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Recommended Action</p>
            <p className="mt-1 text-sm text-slate-300">{result.businessRecommendation}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TagBadge label={`Business Impact: ${result.estimatedBusinessImpact}`} />
            <TagBadge label={`Confidence: ${result.confidence.label}`} />
            <TagBadge label={result.source} />
          </div>
          {result.knowledgeSourcesUsed.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Company Intelligence Used</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {result.knowledgeSourcesUsed.map((source) => (
                  <TagBadge key={source} label={source} />
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Next Step</p>
            <p className="mt-1 text-sm text-slate-300">{result.suggestedNextAction}</p>
          </div>
        </div>
      )}

      {canAct && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
          {stageConfig.touchpointId && !result && (
            <form action={runDealAi}>
              <input type="hidden" name="dealId" value={deal.id} />
              <input type="hidden" name="touchpointId" value={stageConfig.touchpointId} />
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Run AI
              </button>
            </form>
          )}

          {stageConfig.nextStage && (
            <form action={advanceDeal}>
              <input type="hidden" name="dealId" value={deal.id} />
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
              >
                {stageConfig.nextStepLabel ?? "Next Step"}
              </button>
            </form>
          )}

          {deal.stage === "pending-manager-approval" && (
            <StageDecisionActions
              entityId={deal.id}
              action={managerDecision}
              buttons={[
                { outcome: "approve", label: "Approve", variant: "primary" },
                { outcome: "revise", label: "Request Revision", variant: "neutral" },
                { outcome: "reject", label: "Reject", variant: "destructive" },
              ]}
            />
          )}

          {deal.stage === "pending-finance-review" && (
            <StageDecisionActions
              entityId={deal.id}
              action={financeDecision}
              buttons={[
                { outcome: "approve", label: "Approve", variant: "primary" },
                { outcome: "reject", label: "Reject", variant: "destructive" },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
