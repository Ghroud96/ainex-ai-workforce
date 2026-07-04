import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="AINEX Executive Overview"
        description="AINEX is an Enterprise Digital Workforce Platform. It deploys AI Workers that answer business questions, read your company knowledge, and trigger workflows across sales, finance, HR, operations, and customer service. This dashboard is a high-level overview — the full workforce lives in the Digital Workforce module."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Company Health" value="92%" />
        <KpiCard title="Revenue" value="RM2.83M" />
        <KpiCard title="Sales Growth" value="+18%" />
        <KpiCard title="Inventory Alert" value="3" />
      </div>

      <div className="mt-10 rounded-xl bg-slate-900 p-8">
        <h3 className="text-2xl font-semibold">Today&apos;s Executive Brief</h3>

        <div className="mt-6 space-y-4 text-slate-300">
          <p>📈 Revenue increased by 18% this month.</p>
          <p>⚠️ Ganick Ginger inventory will run out in 4 days.</p>
          <p>💰 3 overdue invoices require follow-up.</p>
          <p>🤖 Recommendation: Contact ABC Distributor today.</p>
        </div>
      </div>
    </>
  );
}
