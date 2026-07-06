import DocumentLibrary from "@/components/DocumentLibrary";
import KnowledgeStatCard from "@/components/KnowledgeStatCard";
import ModuleCard from "@/components/ModuleCard";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import TeachAinexSessionStats from "@/components/TeachAinexSessionStats";
import TeachAinexWizard from "@/components/TeachAinexWizard";
import { getAllDocuments, formatFileSize, type DigitalDocument } from "@/data/documents";
import { buildCompanyIntelligenceOverview } from "@/lib/company-intelligence/CompanyIntelligenceOverviewBuilder";
import { getKnowledgePipelineSummary } from "@/lib/services/knowledge/knowledgeHubBridge";

const COVERAGE_TONE: Record<string, string> = {
  Strong: "bg-green-500/10 text-green-400",
  Developing: "bg-amber-500/10 text-amber-400",
  Early: "bg-red-500/10 text-red-400",
};

const roadmapItems = [
  {
    title: "Document Parser",
    description: "Extracts text and structure from uploaded files ahead of indexing.",
  },
  {
    title: "Metadata Extractor",
    description: "Automatically tags department, category, and owner from document content.",
  },
  {
    title: "Embedding Engine",
    description: "Converts document chunks into vector representations for semantic search.",
  },
  {
    title: "Vector Database",
    description: "Stores document embeddings for fast semantic retrieval.",
  },
  {
    title: "Knowledge Index",
    description: "Maintains the searchable index every Digital Worker queries.",
  },
  {
    title: "Retrieval Engine",
    description: "Finds and ranks the most relevant knowledge for a Digital Worker's question.",
  },
];

function activityLabel(document: DigitalDocument): string {
  switch (document.status) {
    case "Indexed":
      return "was indexed";
    case "Processing":
      return `is being processed (${document.processingStage})`;
    case "Pending":
      return "is pending processing";
    case "Archived":
      return "was archived";
  }
}

export default async function KnowledgePage() {
  const documents = getAllDocuments();
  const totalDocuments = documents.length;
  const departmentCount = new Set(documents.map((document) => document.department)).size;
  const totalSizeKb = documents.reduce((sum, document) => sum + document.sizeKb, 0);
  const indexedCount = documents.filter((document) => document.status === "Indexed").length;
  const pendingCount = documents.filter(
    (document) => document.status === "Pending" || document.status === "Processing",
  ).length;
  const sortedByDate = [...documents].sort((a, b) => (a.uploadDate < b.uploadDate ? 1 : -1));
  const latestDocument = sortedByDate[0];
  const recentActivity = sortedByDate.slice(0, 5);
  const pipelineSummary = await getKnowledgePipelineSummary();
  const intelligence = buildCompanyIntelligenceOverview();

  return (
    <>
      <PageHeader
        title="Knowledge Hub"
        description="The Knowledge Hub is the brain of the Digital Workforce. Every document here is a source every Digital Worker will eventually draw on to answer with company-specific context instead of general knowledge."
      />

      <section className="rounded-xl bg-slate-900 p-8">
        <SectionTitle
          title="Teach AINEX about your company"
          description="Upload one of your own documents and watch AINEX learn from it with real, live AI — right inside this demo."
        />
        <TeachAinexWizard />
        <div className="mt-4">
          <TeachAinexSessionStats />
        </div>
      </section>

      <SectionTitle title="Knowledge Overview" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <KnowledgeStatCard title="Total Documents" value={String(totalDocuments)} />
        <KnowledgeStatCard title="Departments" value={String(departmentCount)} />
        <KnowledgeStatCard title="Storage Used" value={formatFileSize(totalSizeKb)} />
        <KnowledgeStatCard
          title="Latest Upload"
          value={latestDocument ? latestDocument.name : "No documents yet"}
          hint={latestDocument ? latestDocument.uploadDate : undefined}
        />
        <KnowledgeStatCard title="Indexed Documents" value={String(indexedCount)} />
        <KnowledgeStatCard title="Pending Processing" value={String(pendingCount)} />
      </div>

      <div className="mt-10">
        <SectionTitle
          title="Company Intelligence Overview"
          description="How much of the company's own knowledge is captured and ready for the Digital Workforce to draw on — deterministic, no AI involved."
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-slate-900 p-6">
            <p className="text-slate-400">Knowledge Coverage</p>
            <div className="mt-4 flex items-center gap-3">
              <h3 className="text-3xl font-bold">{intelligence.coverageScore}/100</h3>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${COVERAGE_TONE[intelligence.coverageLabel]}`}>
                {intelligence.coverageLabel}
              </span>
            </div>
          </div>
          <KnowledgeStatCard title="Knowledge Categories" value={String(intelligence.categoryCounts.length)} />
          <KnowledgeStatCard title="Departments Ready" value={`${intelligence.knowledgeReadyDepartments.length} of ${intelligence.departmentCoverage.length}`} />
          <KnowledgeStatCard title="Missing Knowledge Areas" value={String(intelligence.missingKnowledgeAreas.length)} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-xl bg-slate-900 p-6">
            <p className="mb-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Department Coverage</p>
            <div className="space-y-2">
              {intelligence.departmentCoverage.map((entry) => (
                <div key={entry.department} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{entry.department}</span>
                  <TagBadge label={entry.count === 0 ? "No documents" : `${entry.count} document${entry.count === 1 ? "" : "s"}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 p-6">
            <p className="mb-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Company Intelligence Sources</p>
            <div className="space-y-2">
              {intelligence.sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{source.name}</span>
                  <TagBadge label={source.isImplemented ? `Connected — ${source.documentCount()} documents` : "Not Yet Connected"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {intelligence.totalDocuments === 0 && (
          <p className="mt-4 rounded-lg bg-slate-800/60 p-4 text-sm text-slate-400">
            Upload company documents to build Company Intelligence.
          </p>
        )}
      </div>

      <div className="mt-10">
        <SectionTitle
          title="Pipeline Status"
          description="Where every document currently sits in the Enterprise Intelligence pipeline (Knowledge Hub → Parser → Chunking → Indexing → Retrieval)."
        />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
          <KnowledgeStatCard title="Uploaded" value={String(pipelineSummary.Uploaded)} />
          <KnowledgeStatCard title="Processing" value={String(pipelineSummary.Processing)} />
          <KnowledgeStatCard title="Indexed" value={String(pipelineSummary.Indexed)} />
          <KnowledgeStatCard title="Ready" value={String(pipelineSummary.Ready)} />
          <KnowledgeStatCard title="Pending" value={String(pipelineSummary.Pending)} />
          <KnowledgeStatCard title="Failed" value={String(pipelineSummary.Failed)} />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle title="Recent Activity" />
        <div className="space-y-3 rounded-xl bg-slate-900 p-6">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No document activity yet.</p>
          ) : (
            recentActivity.map((document) => (
              <p key={document.id} className="text-sm text-slate-300">
                <span className="font-medium text-white">{document.name}</span>{" "}
                {activityLabel(document)} on {document.uploadDate}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle
          title="Document Library"
          description="Search and filter every document available to the Digital Workforce."
        />
        <DocumentLibrary documents={documents} />
      </div>

      <div className="mt-10">
        <SectionTitle
          title="Knowledge Intelligence Roadmap"
          description="The retrieval system that will let every Digital Worker query this library directly. Architecture is defined in apps/web/lib/ — real providers are not connected yet."
        />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {roadmapItems.map((item) => (
            <ModuleCard
              key={item.title}
              title={item.title}
              description={item.description}
              status="Architecture Ready"
              statusTone="amber"
            />
          ))}
        </div>
      </div>
    </>
  );
}
