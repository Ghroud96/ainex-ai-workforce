import Link from "next/link";
import DocumentStatus from "@/components/DocumentStatus";
import KnowledgeSourceBadge from "@/components/KnowledgeSourceBadge";
import { formatFileSize, type DigitalDocument } from "@/data/documents";

export default function DocumentTable({ documents }: { documents: DigitalDocument[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/60 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Document</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Owner</th>
            <th className="px-4 py-3">Version</th>
            <th className="px-4 py-3">Uploaded</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Size</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900/20">
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="px-4 py-3 font-medium text-white">{document.name}</td>
              <td className="px-4 py-3">
                <KnowledgeSourceBadge source={document.source} />
              </td>
              <td className="px-4 py-3 text-slate-300">{document.department}</td>
              <td className="px-4 py-3 text-slate-300">{document.category}</td>
              <td className="px-4 py-3 text-slate-300">{document.owner}</td>
              <td className="px-4 py-3 text-slate-300">{document.version}</td>
              <td className="px-4 py-3 text-slate-300">{document.uploadDate}</td>
              <td className="px-4 py-3">
                <DocumentStatus status={document.status} />
              </td>
              <td className="px-4 py-3 text-slate-300">
                {document.fileType} · {formatFileSize(document.sizeKb)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/knowledge/document/${document.id}`}
                  className="text-sm font-medium text-blue-400 hover:text-blue-300"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
