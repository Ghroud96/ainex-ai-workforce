import type { DocumentStatusValue } from "@/data/documents";

const toneByStatus: Record<DocumentStatusValue, string> = {
  Indexed: "bg-green-500/10 text-green-400",
  Processing: "bg-blue-500/10 text-blue-400",
  Pending: "bg-amber-500/10 text-amber-400",
  Archived: "bg-slate-500/10 text-slate-400",
};

export default function DocumentStatus({ status }: { status: DocumentStatusValue }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${toneByStatus[status]}`}
    >
      {status}
    </span>
  );
}
