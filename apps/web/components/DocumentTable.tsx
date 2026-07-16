import Link from "next/link";
import DocumentStatus from "@/components/DocumentStatus";
import KnowledgeSourceBadge from "@/components/KnowledgeSourceBadge";
import { formatFileSize, type DigitalDocument } from "@/data/documents";

export default function DocumentTable({ documents }: { documents: DigitalDocument[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/70">
      <table className="min-w-full divide-y divide-slate-200/70 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-400 uppercase">
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
        <tbody className="divide-y divide-slate-200/70 bg-white">
          {documents.map((document) => (
            <tr key={document.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{document.name}</td>
              <td className="px-4 py-3">
                <KnowledgeSourceBadge source={document.source} />
              </td>
              <td className="px-4 py-3 text-slate-600">{document.department}</td>
              <td className="px-4 py-3 text-slate-600">{document.category}</td>
              <td className="px-4 py-3 text-slate-600">{document.owner}</td>
              <td className="px-4 py-3 text-slate-600">{document.version}</td>
              <td className="px-4 py-3 text-slate-600">{document.uploadDate}</td>
              <td className="px-4 py-3">
                <DocumentStatus status={document.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {document.fileType} · {formatFileSize(document.sizeKb)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/knowledge/document/${document.id}`}
                  className="text-sm font-medium text-blue-700 hover:text-blue-800"
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
