"use client";

import { useFormStatus } from "react-dom";
import { switchCurrentUser } from "@/app/users/actions";
import { FRIENDLY_DEPARTMENT_LABEL, type EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";

// useFormStatus() only sees the nearest parent <form>, same reason
// ScenarioSwitcher splits its select into a Fields subcomponent.
function UserFields({ users, currentUserId }: { users: EnterpriseUser[]; currentUserId: string }) {
  const { pending } = useFormStatus();

  return (
    <select
      name="userId"
      defaultValue={currentUserId}
      disabled={pending}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="w-full rounded-lg border border-slate-800 bg-slate-800 p-2 text-xs text-white outline-none focus:border-blue-600 disabled:opacity-50"
    >
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name} — {user.role} ({FRIENDLY_DEPARTMENT_LABEL[user.departmentWorkerId]})
        </option>
      ))}
    </select>
  );
}

// Mirrors ScenarioSwitcher exactly: outer form + Server Action, inner
// Fields subcomponent auto-submitting on change. This is the only way
// "who's logged in" changes in this no-auth simulation.
export default function UserSwitcher({ users, currentUserId }: { users: EnterpriseUser[]; currentUserId: string }) {
  return (
    <form action={switchCurrentUser} className="mt-6 border-t border-slate-800 pt-4">
      <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Logged in as</p>
      <UserFields key={currentUserId} users={users} currentUserId={currentUserId} />
    </form>
  );
}
