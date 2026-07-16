import { getTodaysDecision } from "@/lib/enterprise/EnterpriseDemoEngine";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";

// The always-visible "where are we" checklist behind the Enterprise Demo
// Experience — a slim, breadcrumb-weight strip, not a section, rendered
// once at the root layout so it's accurate no matter which page is
// current. Invisible until a demo has been started; never nags a
// presenter who's just browsing. Presentation guidance only — it never
// gates navigation, it only reflects state derived elsewhere (see
// lib/enterprise/EnterpriseDemoEngine.ts).
export default function EnterpriseDemoProgress({ company }: { company: GeneratedCompany }) {
  const snapshot = getTodaysDecision(company);
  if (!snapshot) return null;

  return (
    <div className="border-b border-slate-200/70 bg-white px-10 py-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
        <span className="font-medium tracking-wide text-slate-400 uppercase">Enterprise Demo Progress</span>
        {snapshot.screens.map((screen, index) => (
          <span
            key={screen.label}
            className={
              screen.done
                ? "text-green-600"
                : index === snapshot.currentScreenIndex
                  ? "font-semibold text-slate-900"
                  : "text-slate-400"
            }
          >
            {screen.done ? "✓" : "○"} {screen.label}
          </span>
        ))}
      </div>
    </div>
  );
}
