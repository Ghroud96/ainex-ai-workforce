import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";

// The one global, in-memory "who's logged in" selection for this simulated
// multi-user demo — same single-tenant, resets-on-restart, no-DB pattern
// as every other store in this app. Stores only an id (not the full
// EnterpriseUser) so a stale id from a previous company can never render
// stale user data; resolveCurrentUser() below always re-resolves against
// whatever company is currently active.
class CurrentUserStoreImpl {
  private currentUserId: string | null = null;

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  clear(): void {
    this.currentUserId = null;
  }
}

// Anchored to globalThis, not a plain module-level `const` — same reason
// as every other store this app uses (CompanyProfileStore, AiModeStore,
// WorkerAnalysisResultStore): Next.js/Turbopack can compile a Server
// Action's bundle and a page's Server Component bundle as separate module
// graphs in dev, so a plain singleton would silently become two different
// objects.
const GLOBAL_KEY = Symbol.for("ainex.CurrentUserStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: CurrentUserStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const CurrentUserStore: CurrentUserStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new CurrentUserStoreImpl());

// The one implicit person using AINEX before a Live Company has invited
// anyone — a brand-new Live Company still has an account holder, and
// Executive-tier access is the only correct default for someone who
// hasn't yet defined any roles. Exported because app/layout.tsx needs the
// same fallback identity for the UserSwitcher dropdown's option list.
export const FALLBACK_OWNER: EnterpriseUser = {
  id: "owner",
  name: "You",
  departmentWorkerId: "executive",
  role: "Owner",
  roleLevel: "Executive",
  region: "",
  managerName: null,
  status: "Active",
  assignedCustomerIds: [],
  assignedTasks: [],
  assignedMeetings: [],
  assignedApprovals: [],
};

// Resolves the current user against whichever company is active right
// now — self-healing fallback to the first generated user whenever the
// stored id doesn't match (e.g. right after a company regeneration, before
// CurrentUserStore.clear() would otherwise take effect), and to
// FALLBACK_OWNER when the active company has no users at all (a freshly
// empty Live Company). Return type stays non-nullable EnterpriseUser on
// purpose — every one of this function's existing callers already assumes
// a real user.
export function resolveCurrentUser(company: GeneratedCompany): EnterpriseUser {
  if (company.enterpriseUsers.length === 0) return FALLBACK_OWNER;
  const storedId = CurrentUserStore.getCurrentUserId();
  return company.enterpriseUsers.find((user) => user.id === storedId) ?? company.enterpriseUsers[0];
}
