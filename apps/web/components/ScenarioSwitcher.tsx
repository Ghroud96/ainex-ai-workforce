"use client";

import { useFormStatus } from "react-dom";
import { updateCompanyProfile } from "@/app/settings/actions";
import { COMPANY_SIZES } from "@/lib/enterprise/CompanySizeTiers";
import type { CompanySize, Industry } from "@/lib/enterprise/EnterpriseTypes";
import { INDUSTRIES } from "@/lib/enterprise/IndustryTemplates";

// useFormStatus() only sees the nearest parent <form>, so the selects
// live in their own subtree below it — the same reason `pending` isn't
// read directly in ScenarioSwitcher itself.
function ScenarioFields({ industry, size }: { industry: Industry; size: CompanySize }) {
  const { pending } = useFormStatus();

  return (
    <div className="space-y-2">
      <select
        name="industry"
        defaultValue={industry}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="w-full rounded-lg border border-slate-800 bg-slate-800 p-2 text-xs text-white outline-none focus:border-blue-600 disabled:opacity-50"
      >
        {INDUSTRIES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <select
        name="size"
        defaultValue={size}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="w-full rounded-lg border border-slate-800 bg-slate-800 p-2 text-xs text-white outline-none focus:border-blue-600 disabled:opacity-50"
      >
        {COMPANY_SIZES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

// Reuses updateCompanyProfile unchanged (app/settings/actions.ts) — this
// is a second, faster entry point to the same regenerate mechanism, not a
// new one, so it's usable from every page instead of only /settings.
export default function ScenarioSwitcher({ industry, size }: { industry: Industry; size: CompanySize }) {
  return (
    <form action={updateCompanyProfile} className="mt-6 border-t border-slate-800 pt-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Scenario Generator</p>
      <ScenarioFields key={`${industry}::${size}`} industry={industry} size={size} />
    </form>
  );
}
