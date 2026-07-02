import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
  return (
    <main className="min-h-screen bg-[#0B1120] text-white">
      <div className="flex">

        {/* Sidebar */}

        <aside className="w-64 border-r border-slate-800 p-6">

          <h1 className="text-2xl font-bold">
            AINEX One
          </h1>

          <p className="text-sm text-slate-400 mt-2">
            Enterprise AI OS
          </p>

          <nav className="mt-10 space-y-3">

            <button className="w-full rounded-lg bg-blue-600 p-3 text-left">
              Dashboard
            </button>

            <button className="w-full rounded-lg p-3 text-left hover:bg-slate-800">
              AI Chat
            </button>

            <button className="w-full rounded-lg p-3 text-left hover:bg-slate-800">
              Knowledge
            </button>

            <button className="w-full rounded-lg p-3 text-left hover:bg-slate-800">
              Automation
            </button>

            <button className="w-full rounded-lg p-3 text-left hover:bg-slate-800">
              Settings
            </button>

          </nav>

        </aside>

        {/* Content */}

        <section className="flex-1 p-10">

          <h2 className="text-4xl font-bold">
            Good Morning, Gabriel 👋
          </h2>

          <p className="mt-2 text-slate-400">
            Welcome back to AINEX One.
          </p>

          <div className="mt-10 grid grid-cols-4 gap-5">

            <Card
              title="Company Health"
              value="92%"
            />

            <Card
              title="Revenue"
              value="RM2.83M"
            />

            <Card
              title="Sales Growth"
              value="+18%"
            />

            <Card
              title="Inventory Alert"
              value="3"
            />

          </div>

          <div className="mt-10 rounded-xl bg-slate-900 p-8">

            <h3 className="text-2xl font-semibold">
              Today's Executive Summary
            </h3>

            <ul className="mt-6 space-y-3 text-slate-300">

              <li>
                📈 Revenue increased by 18% this month.
              </li>

              <li>
                ⚠ Ganick Ginger inventory will run out in 4 days.
              </li>

              <li>
                💰 3 overdue invoices require follow-up.
              </li>

              <li>
                🤖 Recommendation: Contact ABC Distributor today.
              </li>

            </ul>

          </div>

        </section>

      </div>
    </main>
  )
}

function Card({
  title,
  value,
}: {
  title: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-6">

      <p className="text-slate-400">
        {title}
      </p>

      <h3 className="mt-4 text-3xl font-bold">
        {value}
      </h3>

    </div>
  )
}