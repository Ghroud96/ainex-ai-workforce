import { TeachAinexSessionStore } from "@/lib/knowledge/TeachAinexSessionStore";

// A page-level sibling to TeachAinexWizard, not nested inside it — this is
// a Server Component reading the session store directly, which a Client
// Component (the wizard) cannot import/instantiate itself. Zero uploads
// yet is a normal, expected state, not an error.
export default function TeachAinexSessionStats() {
  const snapshot = TeachAinexSessionStore.snapshot();

  if (snapshot.uploadCount === 0) {
    return null;
  }

  return (
    <p className="text-xs text-slate-500">
      Current session: {snapshot.uploadCount} uploaded file{snapshot.uploadCount === 1 ? "" : "s"} · Live AI Runs{" "}
      {snapshot.liveAiCallCount} · Estimated AI Cost RM{snapshot.estimatedCostRm.toFixed(2)}
    </p>
  );
}
