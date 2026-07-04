import DocumentLibrary from "@/components/DocumentLibrary";
import KnowledgeStatCard from "@/components/KnowledgeStatCard";
import ModuleCard from "@/components/ModuleCard";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import { documents, formatFileSize, type DigitalDocument } from "@/data/documents";
import { getKnowledgePipelineSummary } from "@/lib/services/knowledge/knowledgeHubBridge";

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

  return (
    <>
      <PageHeader
        title="Knowledge Hub"
        description="The Knowledge Hub is the brain of the Digital Workforce. Every document here is a source every Digital Worker will eventually draw on to answer with company-specific context instead of general knowledge."
      />

      <SectionTitle title="Knowledge Overview" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <KnowledgeStatCard title="Total Documents" value={String(totalDocuments)} />
        <KnowledgeStatCard title="Departments" value={String(departmentCount)} />
        <KnowledgeStatCard title="Storage Used" value={formatFileSize(totalSizeKb)} />
        <KnowledgeStatCard
          title="Latest Upload"
          value={latestDocument.name}
          hint={latestDocument.uploadDate}
        />
        <KnowledgeStatCard title="Indexed Documents" value={String(indexedCount)} />
        <KnowledgeStatCard title="Pending Processing" value={String(pendingCount)} />
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
          {recentActivity.map((document) => (
            <p key={document.id} className="text-sm text-slate-300">
              <span className="font-medium text-white">{document.name}</span>{" "}
              {activityLabel(document)} on {document.uploadDate}
            </p>
          ))}
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
