import LoadingState from "@/components/design/LoadingState";
import { surface } from "@/lib/design/colors";
import { radius } from "@/lib/design/radius";

export default function WorkerIntelligenceLoading() {
  return (
    <div className="space-y-10">
      <div className={`h-40 ${radius.card} ${surface.card} animate-pulse`} />
      <LoadingState label="Preparing this worker's understanding of the company…" />
    </div>
  );
}
