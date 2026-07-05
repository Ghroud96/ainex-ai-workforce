import Link from "next/link";
import { notFound } from "next/navigation";
import DocumentCard from "@/components/DocumentCard";
import DocumentStatus from "@/components/DocumentStatus";
import PriorityBadge from "@/components/PriorityBadge";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import WorkflowCard from "@/components/WorkflowCard";
import {
  getAllDocuments,
  formatFileSize,
  getDocumentById,
  PROCESSING_STAGES,
} from "@/data/documents";
import { getAllWorkers } from "@/data/workers";
import { enrichDocument } from "@/lib/enterprise/BusinessInsights";
import { summarizeDocument } from "@/lib/services/knowledge/DocumentIntelligenceService";
import { getKnowledgePipelineResult } from "@/lib/services/knowledge/knowledgeHubBridge";

const PIPELINE_STATUS_TONE: Record<string, string> = {
  Uploaded: "bg-slate-500/10 text-slate-400",
  Processing: "bg-blue-500/10 text-blue-400",
  Indexed: "bg-green-500/10 text-green-400",
  Ready: "bg-green-500/10 text-green-400",
  Pending: "bg-amber-500/10 text-amber-400",
  Failed: "bg-red-500/10 text-red-400",
};

const CORE_USAGE_WORKERS = [
  "Executive Worker",
  "Finance Worker",
  "Sales Worker",
  "Inventory Worker",
  "HR Worker",
  "Operations Worker",
  "Customer Support Worker",
];

export function generateStaticParams() {
  return getAllDocuments().map((document) => ({ id: document.id }));
}

function findWorkflowDescription(name: string): string {
  for (const worker of getAllWorkers()) {
    const match = worker.workflows.find((workflow) => workflow.name === name);
    if (match) return match.description;
  }
  return "Triggered automatically when this document's content changes.";
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const document = getDocumentById(id);

  if (!document) {
    notFound();
  }

  const relatedWorkers = getAllWorkers().filter((worker) => document.usedBy.includes(worker.name));
  const relatedDocuments = document.relatedDocuments
    .map((relatedId) => getDocumentById(relatedId))
    .filter((related): related is NonNullable<typeof related> => Boolean(related));
  const currentStageIndex = PROCESSING_STAGES.indexOf(document.processingStage);
  const pipelineResult = await getKnowledgePipelineResult(document.id);
  const { usageCount, businessImportance } = enrichDocument(document);
  const intelligence = await summarizeDocument(document);

  return (
    <div className="max-w-5xl space-y-10">
      <Link href="/knowledge" className="text-sm font-medium text-blue-400 hover:text-blue-300">
        ← Back to Knowledge Hub
      </Link>

      <div className="rounded-xl bg-slate-900 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              {document.department} · {document.category}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">{document.name}</h1>
          </div>
          <DocumentStatus status={document.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={businessImportance} />
          <span className="text-xs text-slate-500">
            Used {usageCount} time{usageCount === 1 ? "" : "s"} across the Digital Workforce
          </span>
        </div>

        <p className="mt-6 max-w-3xl text-slate-300">{document.description}</p>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-slate-800/60 p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Owner</dt>
            <dd className="mt-1 text-slate-200">{document.owner}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Version</dt>
            <dd className="mt-1 text-slate-200">{document.version}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              Upload Date
            </dt>
            <dd className="mt-1 text-slate-200">{document.uploadDate}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
              File Size
            </dt>
            <dd className="mt-1 text-slate-200">
              {document.fileType} · {formatFileSize(document.sizeKb)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          {document.tags.map((tag) => (
            <TagBadge key={tag} label={tag} />
          ))}
        </div>
      </div>

      <section>
        <SectionTitle
          title="Processing Pipeline"
          description="Where this document is in the knowledge processing pipeline."
        />
        <div className="flex flex-wrap gap-2">
          {PROCESSING_STAGES.map((stage, index) => {
            const isCurrent = index === currentStageIndex;
            const reached = index <= currentStageIndex;

            return (
              <span
                key={stage}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  isCurrent
                    ? "bg-blue-500/10 text-blue-400"
                    : reached
                      ? "bg-green-500/10 text-green-400"
                      : "bg-slate-500/10 text-slate-500"
                }`}
              >
                {stage}
              </span>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Knowledge Pipeline"
          description="How this document has moved through the Enterprise Intelligence pipeline — architecture only, no AI provider is connected yet."
        />
        {pipelineResult ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Pipeline Status
              </p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  PIPELINE_STATUS_TONE[pipelineResult.status]
                }`}
              >
                {pipelineResult.status}
              </span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Chunk Count
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{pipelineResult.chunkCount}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Chunk Strategy
              </p>
              <p className="mt-2 text-lg font-semibold text-white">{pipelineResult.chunkStrategy}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Retrieval Ready
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {pipelineResult.retrievalReady ? "Yes" : "Not yet"}
              </p>
            </div>
            {pipelineResult.previewText && (
              <div className="sm:col-span-2 md:col-span-4 rounded-lg border border-slate-800 bg-slate-900 p-4">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Document Preview
                </p>
                <p className="mt-2 text-sm text-slate-300">{pipelineResult.previewText}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No pipeline data available for this document.</p>
        )}
      </section>

      <section>
        <SectionTitle
          title="Executive Worker Summary"
          description="The Executive Worker's read of this document — a deterministic preview when Live AI is off, a real AI-generated brief when it's on, always in the same shape."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-sm text-slate-200">{intelligence.executiveSummary}</p>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Key Findings</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {intelligence.keyFindings.map((finding, index) => (
                  <li key={index}>• {finding}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Business Risks</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {intelligence.businessRisks.map((risk, index) => (
                  <li key={index}>• {risk}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Business Opportunities</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {intelligence.businessOpportunities.map((opportunity, index) => (
                  <li key={index}>• {opportunity}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Recommended Actions</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {intelligence.recommendedActions.map((action, index) => (
                <li key={index}>• {action}</li>
              ))}
            </ul>
          </div>

          <p className="mt-6 border-t border-slate-800 pt-4 text-sm text-slate-400">
            <span className="font-medium text-slate-300">Executive Conclusion: </span>
            {intelligence.executiveConclusion}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <TagBadge label={`Sources: ${intelligence.knowledgeSourcesUsed.join(", ")}`} />
            <TagBadge label={`Model: ${intelligence.modelUsed}`} />
            <TagBadge label={intelligence.source} />
            <TagBadge label={`Generation Time: ${intelligence.generationTimeMs === 0 ? "Instant" : `${intelligence.generationTimeMs}ms`}`} />
          </div>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Related Digital Workers"
          description="Digital Workers that currently draw on this document."
        />
        {relatedWorkers.length === 0 ? (
          <p className="text-sm text-slate-500">No Digital Worker uses this document yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {relatedWorkers.map((worker) => (
              <Link
                key={worker.slug}
                href={`/workforce/${worker.slug}`}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700"
              >
                <p className="text-sm font-medium text-white">{worker.name}</p>
                <p className="mt-1 text-xs text-slate-500">{worker.department}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Knowledge Usage"
          description="Coverage across the core Digital Workforce roster, for governance and audit."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CORE_USAGE_WORKERS.map((workerName) => {
            const used = document.usedBy.includes(workerName);

            return (
              <div
                key={workerName}
                className={`flex items-center gap-3 rounded-lg border border-slate-800 p-4 text-sm ${
                  used ? "bg-slate-900 text-slate-200" : "bg-slate-900/40 text-slate-600"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    used ? "bg-green-500/10 text-green-400" : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {used ? "✓" : "–"}
                </span>
                {workerName}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle
          title="Connected Workflows"
          description="Workflow Automation that reacts to this document's content."
        />
        {document.workflows.length === 0 ? (
          <p className="text-sm text-slate-500">No workflow is connected to this document yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {document.workflows.map((workflowName) => (
              <WorkflowCard
                key={workflowName}
                name={workflowName}
                description={findWorkflowDescription(workflowName)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle title="Related Documents" />
        {relatedDocuments.length === 0 ? (
          <p className="text-sm text-slate-500">No related documents yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {relatedDocuments.map((related) => (
              <DocumentCard key={related.id} document={related} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
