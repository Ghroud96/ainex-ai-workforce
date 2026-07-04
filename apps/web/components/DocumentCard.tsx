import Link from "next/link";
import DocumentStatus from "@/components/DocumentStatus";
import TagBadge from "@/components/TagBadge";
import { formatFileSize, type DigitalDocument } from "@/data/documents";

export default function DocumentCard({ document }: { document: DigitalDocument }) {
  return (
    <div className="flex flex-col rounded-xl bg-slate-900 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{document.name}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {document.department} · {document.category}
          </p>
        </div>
        <DocumentStatus status={document.status} />
      </div>

      <p className="mt-4 flex-1 text-sm text-slate-300">{document.description}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {document.tags.map((tag) => (
          <TagBadge key={tag} label={tag} />
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-500">
        <div>
          <dt className="uppercase tracking-wide">Owner</dt>
          <dd className="mt-0.5 text-slate-300">{document.owner}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Version</dt>
          <dd className="mt-0.5 text-slate-300">{document.version}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Uploaded</dt>
          <dd className="mt-0.5 text-slate-300">{document.uploadDate}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">File</dt>
          <dd className="mt-0.5 text-slate-300">
            {document.fileType} · {formatFileSize(document.sizeKb)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center gap-3 border-t border-slate-800 pt-4">
        <Link
          href={`/knowledge/document/${document.id}`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          View
        </Link>
        <button
          type="button"
          disabled
          title="Download will be available once document storage is connected"
          className="cursor-not-allowed rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Download
        </button>
        <button
          type="button"
          disabled
          title="Delete will be available once document storage is connected"
          className="cursor-not-allowed rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
