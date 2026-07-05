import DecisionCard from "@/components/DecisionCard";
import PageHeader from "@/components/PageHeader";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { DecisionStore } from "@/lib/decisions/DecisionStore";

export default function DecisionsPage() {
  const { company } = CompanyProfileStore.getCurrent();
  const decisions = DecisionStore.listFor(company);
  const pending = decisions.filter((decision) => decision.status === "Pending");
  const resolved = decisions.filter((decision) => decision.status !== "Pending");

  return (
    <>
      <PageHeader
        title="Decision Center"
        description={`Business recommendations your Digital Workforce has raised for ${company.profile.name} — approve to keep them moving, reject to dismiss, or view details before deciding.`}
      />

      {decisions.length === 0 ? (
        <p className="text-sm text-slate-500">No decisions are waiting on you right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {pending.map((decision) => (
              <DecisionCard key={decision.id} decision={decision} />
            ))}
          </div>

          {resolved.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-white">Resolved</h2>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {resolved.map((decision) => (
                  <DecisionCard key={decision.id} decision={decision} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
