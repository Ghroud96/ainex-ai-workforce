import Stepper from "@/components/Stepper";
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

  return <Stepper steps={MILESTONES} currentIndex={currentIndex} />;
}
