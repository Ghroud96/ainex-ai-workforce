"use client";

import { useFormStatus } from "react-dom";
import { setPresentationRole } from "@/app/settings/presentationRoleActions";
import type { PresentationRole } from "@/lib/enterprise/PresentationModeStore";

const ROLE_LABEL: Record<PresentationRole, string> = {
  "sales-rep": "Sales Executive",
  "sales-manager": "Sales Manager",
  finance: "Finance",
  executive: "CEO (Executive)",
};

const ROLE_ORDER: PresentationRole[] = ["sales-rep", "sales-manager", "finance", "executive"];

// useFormStatus() only sees the nearest parent <form>, same reason
// UserSwitcher/ScenarioSwitcher split their select into a Fields
// subcomponent.
function RoleFields({ role }: { role: PresentationRole }) {
  const { pending } = useFormStatus();

  return (
    <select
      name="role"
      defaultValue={role}
      disabled={pending}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="w-full rounded-lg border border-slate-800 bg-slate-800 p-2 text-xs text-white outline-none focus:border-blue-600 disabled:opacity-50"
    >
      {ROLE_ORDER.map((value) => (
        <option key={value} value={value}>
          {ROLE_LABEL[value]}
        </option>
      ))}
    </select>
  );
}

// Rendered only while Demo Mode is on (see Sidebar.tsx) — a presentation
// convenience only, never a real identity or permission change. Clearly
// labeled "Presenting:" to stay visually distinct from "Logged in as:"
// (UserSwitcher.tsx) and from the unrelated static /presentation route in
// the main nav.
export default function PresentationRoleSwitcher({ role }: { role: PresentationRole }) {
  return (
    <form action={setPresentationRole} className="mt-4 border-t border-slate-800 pt-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Presenting</p>
      <RoleFields key={role} role={role} />
    </form>
  );
}
