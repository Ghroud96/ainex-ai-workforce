import type { WorkflowRunAuditEntry } from "@/lib/workflow/WorkflowTypes";

export default function WorkflowAuditLogPanel({ entries }: { entries: WorkflowRunAuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No audit events recorded for this run.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm font-medium text-white">{entry.eventType.replaceAll("_", " ")}</p>
            <span className="text-xs text-slate-500">{entry.timestamp}</span>
          </div>
          <p className="mt-1 text-sm text-slate-300">{entry.message}</p>
          <p className="mt-2 text-xs text-slate-500">Actor: {entry.actor}</p>
        </div>
      ))}
    </div>
  );
}
