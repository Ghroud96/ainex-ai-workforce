import type { DealStage } from "@/lib/sales/SalesDealTypes";

const MILESTONES = ["Customer", "Meeting", "Quotation", "Manager Approval", "Finance Review", "Completed"] as const;

// Collapses the 13 granular DealStage values into the 6 milestones a
// presenter can read at a glance. rejected is deliberately excluded — it
// can happen from either the Manager or Finance gate, so forcing it onto a
// fractional stepper position would misrepresent which gate it failed at.
const STAGE_TO_MILESTONE_INDEX: Record<DealStage, number> = {
  "follow-up-needed": 0,
  "customer-analyzed": 0,
  "meeting-planned": 1,
  "meeting-completed": 1,
  "meeting-summarized": 1,
  "follow-up-drafted": 2,
  "quotation-drafted": 2,
  "order-drafted": 3,
  "pending-manager-approval": 3,
  "revision-requested": 3,
  "pending-finance-review": 4,
  confirmed: 5,
  rejected: -1,
};

export default function DealStageStepper({ stage }: { stage: DealStage }) {
  if (stage === "rejected") {
    return (
      <div className="inline-flex items-center rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400">
        Rejected — this deal did not proceed
      </div>
    );
  }

  const currentIndex = STAGE_TO_MILESTONE_INDEX[stage];

  return (
    <div className="flex items-center">
      {MILESTONES.map((milestone, index) => (
        <div key={milestone} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                index < currentIndex
                  ? "bg-green-500"
                  : index === currentIndex
                    ? "bg-blue-500 ring-4 ring-blue-500/20"
                    : "bg-slate-700"
              }`}
            />
            <span
              className={`whitespace-nowrap text-[11px] ${
                index === currentIndex ? "font-semibold text-white" : index < currentIndex ? "text-green-400" : "text-slate-500"
              }`}
            >
              {milestone}
            </span>
          </div>
          {index < MILESTONES.length - 1 && (
            <div className={`mb-4 h-px w-6 sm:w-10 ${index < currentIndex ? "bg-green-500" : "bg-slate-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
