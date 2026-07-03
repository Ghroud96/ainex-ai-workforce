export default function DashboardPage() {
  return (
    <>
      <h2 className="text-4xl font-bold">Good Morning, Gabriel 👋</h2>
      <p className="mt-2 text-slate-400">
        Your company intelligence brief is ready.
      </p>

      <div className="mt-10 grid grid-cols-4 gap-5">
        <Card title="Company Health" value="92%" />
        <Card title="Revenue" value="RM2.83M" />
        <Card title="Sales Growth" value="+18%" />
        <Card title="Inventory Alert" value="3" />
      </div>

      <div className="mt-10 rounded-xl bg-slate-900 p-8">
        <h3 className="text-2xl font-semibold">Today's Executive Brief</h3>

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

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-6">
      <p className="text-slate-400">{title}</p>
      <h3 className="mt-4 text-3xl font-bold">{value}</h3>
    </div>
  );
}