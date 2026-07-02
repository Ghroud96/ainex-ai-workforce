export default function DashboardPage() {
    return (
      <main className="min-h-screen bg-[#0B1120] text-white">
        <div className="flex">
          <aside className="w-64 min-h-screen border-r border-slate-800 p-6">
            <h1 className="text-2xl font-bold">AINEX One</h1>
            <p className="mt-2 text-sm text-slate-400">Enterprise AI OS</p>
  
            <nav className="mt-10 space-y-3">
              {["Dashboard", "AI Chat", "Knowledge", "Automation", "Settings"].map(
                (item) => (
                  <div
                    key={item}
                    className={`rounded-lg p-3 ${
                      item === "Dashboard"
                        ? "bg-blue-600"
                        : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    {item}
                  </div>
                )
              )}
            </nav>
          </aside>
  
          <section className="flex-1 p-10">
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
              <h3 className="text-2xl font-semibold">
                Today's Executive Brief
              </h3>
  
              <div className="mt-6 space-y-4 text-slate-300">
                <p>📈 Revenue increased by 18% this month.</p>
                <p>⚠️ Ganick Ginger inventory will run out in 4 days.</p>
                <p>💰 3 overdue invoices require follow-up.</p>
                <p>🤖 Recommendation: Contact ABC Distributor today.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
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