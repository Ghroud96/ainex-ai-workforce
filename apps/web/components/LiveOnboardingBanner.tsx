const STEPS = [
  { title: "Upload Documents", description: "Add company documents to build Company Intelligence." },
  { title: "Invite Employees", description: "Bring your team into AINEX to start using Digital Workers." },
  { title: "Connect Business Systems", description: "Link CRM, ERP, or other systems to bring in real business data." },
  { title: "Create Workflow", description: "Set up your first automated workflow." },
  { title: "Start Using Digital Workers", description: "Put your Digital Workforce to work on real company data." },
] as const;

export default function LiveOnboardingBanner() {
  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-8">
      <h2 className="text-2xl font-semibold text-slate-900">Welcome to AINEX. Let&apos;s build your company.</h2>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-lg border border-slate-200/70 bg-white p-4">
            <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">Step {index + 1}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="mt-1 text-xs text-slate-500">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
