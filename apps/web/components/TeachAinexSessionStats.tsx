import { resetTeachAinexSession } from "@/app/knowledge/teachAinexActions";
import KpiCard from "@/components/KpiCard";
import TagBadge from "@/components/TagBadge";
import { TeachAinexSessionStore } from "@/lib/knowledge/TeachAinexSessionStore";
import { UploadedDocumentStore } from "@/lib/knowledge/UploadedDocumentStore";

// A page-level sibling to TeachAinexWizard, not nested inside it — this is
// a Server Component reading the session store directly, which a Client
// Component (the wizard) cannot import/instantiate itself. Zero uploads
// yet is a normal, expected state, not an error.
export default function TeachAinexSessionStats() {
  const snapshot = TeachAinexSessionStore.snapshot();

  if (snapshot.uploadCount === 0) {
    return null;
  }

  const learned = UploadedDocumentStore.getAll();

  return (
    <div className="space-y-4 border-t border-slate-200/70 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Demo Session</p>
        <form action={resetTeachAinexSession}>
          <button type="submit" className="text-xs font-medium text-slate-400 hover:text-slate-700">
            Reset Demo Session
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard title="Company Documents Learned" value={String(snapshot.uploadCount)} />
        <KpiCard title="Workers Updated" value={String(snapshot.workersUpdatedCount)} />
        <KpiCard title="Live AI Analyses" value={String(snapshot.liveAiCallCount)} />
        <KpiCard title="Estimated AI Cost" value={`RM${snapshot.estimatedCostRm.toFixed(2)}`} />
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Company Intelligence Learned This Session
        </p>
        <div className="mt-2 space-y-2">
          {learned.map((document) => (
            <div key={document.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-800">{document.name}</span>
              <TagBadge label={document.department} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
