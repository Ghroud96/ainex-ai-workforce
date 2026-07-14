import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";

// A presentation-only role lens — never a real identity change (see
// lib/enterprise/CurrentUserStore.ts for that). Distinct from the
// pre-existing /presentation route in the main nav ("Presentation Mode",
// a static, stateless board-room recap) — this store has nothing to do
// with that page; it exists so a presenter in Demo Mode can view a
// Manager/Finance-owned section without a real user switch, and so
// future departments (HR, Inventory, Procurement, ...) can add a role
// here consistently instead of each inventing their own bypass.
export type PresentationRole = "sales-rep" | "sales-manager" | "finance" | "executive";

class PresentationModeStoreImpl {
  private role: PresentationRole | null = null;

  get(): PresentationRole | null {
    return this.role;
  }

  set(role: PresentationRole | null): void {
    this.role = role;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.PresentationModeStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: PresentationModeStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const PresentationModeStore: PresentationModeStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new PresentationModeStoreImpl());

// Only ever true when Demo Mode is on — Live Company always resolves the
// real logged-in user's real role via resolveCurrentUser(), this lens is
// never consulted there. The only new authorization primitive this pass
// adds; every other authorizedOrDemoMode() call site is untouched.
export function isPresentingAs(role: PresentationRole): boolean {
  return CompanyModeStore.isDemoModeEnabled() && PresentationModeStore.get() === role;
}
