import TagBadge from "@/components/TagBadge";
import {
  FRIENDLY_DEPARTMENT_LABEL,
  WORKER_IDS,
  canAccessWorker,
  type EnterpriseUser,
} from "@/lib/enterprise/EnterpriseUserTypes";

const STATUS_TONE: Record<EnterpriseUser["status"], string> = {
  Active: "bg-green-50 text-green-700",
  "On Leave": "bg-amber-50 text-amber-700",
  Inactive: "bg-slate-100 text-slate-600",
};

export default function UserCard({ user }: { user: EnterpriseUser }) {
  const accessibleWorkers = WORKER_IDS.filter((workerId) => canAccessWorker(user, workerId));

  return (
    <div className="flex flex-col rounded-xl border border-slate-200/70 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{user.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{user.role}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[user.status]}`}>
          {user.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TagBadge label={FRIENDLY_DEPARTMENT_LABEL[user.departmentWorkerId]} />
        <TagBadge label={user.roleLevel} />
        <TagBadge label={user.region} />
      </div>

      <div className="mt-4 space-y-1 border-t border-slate-200/70 pt-4 text-sm text-slate-500">
        <p>Reports to: {user.managerName ?? "—"}</p>
        {user.assignedCustomerIds.length > 0 && <p>{user.assignedCustomerIds.length} assigned customers</p>}
        {user.assignedApprovals.length > 0 && <p>{user.assignedApprovals.length} pending approvals</p>}
      </div>

      <div className="mt-4 border-t border-slate-200/70 pt-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-slate-400 uppercase">Can Execute</p>
        <div className="flex flex-wrap gap-2">
          {accessibleWorkers.map((workerId) => (
            <TagBadge key={workerId} label={FRIENDLY_DEPARTMENT_LABEL[workerId]} />
          ))}
        </div>
      </div>
    </div>
  );
}
