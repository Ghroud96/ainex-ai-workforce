import ActivityTimeline from "@/components/ActivityTimeline";
import KnowledgeStatCard from "@/components/KnowledgeStatCard";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import WorkerCard from "@/components/WorkerCard";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { buildWorkforceActivityFeed } from "@/lib/enterprise/NarrativeBuilder";
import { WorkforceService } from "@/services/workforce/WorkforceService";

export default function WorkforcePage() {
  const workers = WorkforceService.getAll();
  const stats = WorkforceService.getStats();
  const { company } = CompanyProfileStore.getCurrent();
  const recentActivity = buildWorkforceActivityFeed(company, 6);

  return (
    <>
      <PageHeader
        title="Digital Workforce"
        description={`${company.profile.name}'s Digital Workers — each one is built to support a specific business function, already working from real company data, and able to trigger workflows on your behalf.`}
      />

      <SectionTitle
        title="Digital Workforce Dashboard"
        description="Live counts from the Worker Registry — the engine every worker below is registered in."
      />
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
        <KnowledgeStatCard title="Total Workers" value={String(stats.total)} />
        <KnowledgeStatCard title="Available" value={String(stats.available)} />
        <KnowledgeStatCard title="In Development" value={String(stats.inDevelopment)} />
        <KnowledgeStatCard title="Offline" value={String(stats.offline)} />
        <KnowledgeStatCard title="Company Employees" value={company.profile.employeeCount.toLocaleString()} />
        <KnowledgeStatCard title="Connected Integrations" value={String(stats.connectedIntegrations)} />
      </div>

      <div className="mt-10">
        <SectionTitle
          title="Recent Activity"
          description="What the Digital Workforce has been doing this morning — the full feed lives on Executive Intelligence."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <ActivityTimeline
            entries={recentActivity.map((entry) => ({ time: entry.time, title: entry.workerName, description: entry.text }))}
          />
        </div>
      </div>

      <div className="mt-10">
        <SectionTitle
          title="Worker Health"
          description={`${stats.operational} of ${stats.total} workers are operational (Available status).`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {workers.map((worker) => (
          <WorkerCard key={worker.id} worker={WorkforceService.toCardData(worker)} />
        ))}
      </div>
    </>
  );
}
