import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import TagBadge from "@/components/TagBadge";
import { updateCompanyProfile } from "@/app/settings/actions";
import { setLiveAiMode } from "@/app/settings/aiActions";
import { setDemoCompanyMode } from "@/app/settings/companyModeActions";
import { buildCompanyStory } from "@/lib/enterprise/BusinessInsights";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { COMPANY_SIZES } from "@/lib/enterprise/CompanySizeTiers";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { formatCurrency } from "@/lib/enterprise/CompanyGenerator";
import { INDUSTRIES } from "@/lib/enterprise/IndustryTemplates";
import { AiModeStore } from "@/lib/llm/AiModeStore";

export default function SettingsPage() {
  const { industry, size, company } = CompanyProfileStore.getCurrent();
  const { profile } = company;
  const story = buildCompanyStory(company);
  const liveAiEnabled = AiModeStore.isLiveModeEnabled();
  const demoModeEnabled = CompanyModeStore.isDemoModeEnabled();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your organization, users, and AINEX configuration."
      />

      <section className="mb-10">
        <SectionTitle
          title="Company Profile"
          description="The enterprise environment your Digital Workforce operates in today — generated, internally consistent, and used across every module."
        />

        <div className="rounded-xl bg-slate-900 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                {profile.industry} · {profile.size}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">{profile.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{profile.tagline}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TagBadge label={`Founded ${profile.foundedYear}`} />
              <TagBadge label={`${profile.hqCity}, ${profile.hqRegion}`} />
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-sm text-slate-300">{profile.description}</p>

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-slate-800/60 p-4 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Employees</dt>
              <dd className="mt-1 text-slate-200">{profile.employeeCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Annual Revenue</dt>
              <dd className="mt-1 text-slate-200">{formatCurrency(profile.annualRevenue, profile.currency)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Fiscal Period</dt>
              <dd className="mt-1 text-slate-200">{profile.fiscalYearLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Currency</dt>
              <dd className="mt-1 text-slate-200">{profile.currency}</dd>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          title="The Business Story"
          description="A believable read on where this enterprise stands today — derived from its real generated financials, customers, and inventory, not a separate narrative."
        />
        <div className="rounded-xl bg-slate-900 p-8">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Current Business Situation</p>
            <p className="mt-2 text-sm text-slate-300">{story.situation}</p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Current Challenges</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                {story.challenges.map((challenge, index) => (
                  <li key={index}>• {challenge}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Growth Opportunities</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-300">
                {story.opportunities.map((opportunity, index) => (
                  <li key={index}>• {opportunity}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle
          title="Generate a Different Enterprise"
          description="Choose an industry and company size — AINEX regenerates the entire environment (org structure, customers, suppliers, inventory, financials, Knowledge Hub, and every Digital Worker's context) to match, consistently, across the whole platform."
        />

        <form action={updateCompanyProfile} className="rounded-xl bg-slate-900 p-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="industry" className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                defaultValue={industry}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-800 p-3 text-sm text-white outline-none focus:border-blue-600"
              >
                {INDUSTRIES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="size" className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Company Size
              </label>
              <select
                id="size"
                name="size"
                defaultValue={size}
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-800 p-3 text-sm text-white outline-none focus:border-blue-600"
              >
                {COMPANY_SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            Regenerate Company
          </button>
        </form>
      </section>

      <section>
        <SectionTitle
          title="AI Provider Settings"
          description="Controls whether the Executive Worker's document summaries use a real AI provider or stay in Demo Mode. Off by default — enabling Live AI is always an explicit choice made here."
        />
        <div className="rounded-xl bg-slate-900 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Current Mode</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {liveAiEnabled ? "Live AI Mode" : "Demo Mode"}
              </p>
            </div>
            <TagBadge label={liveAiEnabled ? "Live AI" : "Demo Mode"} />
          </div>

          <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
            Live AI may use real API credits.
          </p>

          <p className="mt-4 text-sm text-slate-400">
            {liveAiEnabled
              ? "The Executive Worker sends uploaded document content to the configured AI provider. If the provider fails or no key is configured, AINEX falls back to Demo Mode automatically."
              : "The Executive Worker uses Demo Mode for every document summary. No request ever leaves AINEX."}
          </p>

          <form action={setLiveAiMode} className="mt-6">
            <input type="hidden" name="enabled" value={liveAiEnabled ? "false" : "true"} />
            <button
              type="submit"
              className={
                liveAiEnabled
                  ? "rounded-lg bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                  : "rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              }
            >
              {liveAiEnabled ? "Disable Live AI" : "Enable Live AI"}
            </button>
          </form>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Experience"
          description="Choose which Company Data Provider powers AINEX. Enterprise Demo behaves exactly as today with realistic generated data. Live Company starts empty and only reflects what you actually add — no demo data is ever shown."
        />
        <div className="rounded-xl bg-slate-900 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Current Experience</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {demoModeEnabled ? "🟢 Enterprise Demo" : "⚪ Live Company"}
              </p>
            </div>
            <TagBadge label={demoModeEnabled ? "Enterprise Demo" : "Live Company"} />
          </div>

          <p className="mt-4 text-sm text-slate-400">
            {demoModeEnabled
              ? "Every page shows a realistic, fully generated company — customers, deals, documents, and workflows are all demo data. Every Digital Worker's execution and every deal-workflow action is executable by the current simulated user without switching users."
              : "Your Live Company starts empty. Nothing is generated — upload documents, invite employees, and add real business data to see it reflected everywhere. Digital Worker execution and deal-workflow actions require the current simulated user to hold the right role, the same permission architecture that ships in production."}
          </p>

          <p className="mt-4 text-sm text-slate-400">Changing experience switches the active Company Data Provider.</p>

          <form action={setDemoCompanyMode} className="mt-6">
            <input type="hidden" name="enabled" value={demoModeEnabled ? "false" : "true"} />
            <button
              type="submit"
              className={
                demoModeEnabled
                  ? "rounded-lg bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
                  : "rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
              }
            >
              {demoModeEnabled ? "Switch to ⚪ Live Company" : "Switch to 🟢 Enterprise Demo"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
