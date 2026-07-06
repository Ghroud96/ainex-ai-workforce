// The one switch that decides whether every permission check in the app
// (Digital Worker execute access, deal-workflow Run AI / advance / manager
// approve-reject / finance approve-reject) automatically succeeds for the
// current simulated user. Defaults to true: AINEX today has no real tenant
// or real user accounts, only a single generated demo company, so the
// friction this bypasses is pure demo overhead, not a real access boundary
// — unlike AiModeStore's Live AI flag (which defaults off to guard real API
// spend), there is no real-world cost this default needs to protect
// against. Anchored to globalThis for the same reason as
// CompanyProfileStore.ts (Turbopack module-graph splitting).
class CompanyModeStoreImpl {
  private demoModeEnabled = true;

  isDemoModeEnabled(): boolean {
    return this.demoModeEnabled;
  }

  setDemoModeEnabled(enabled: boolean): void {
    this.demoModeEnabled = enabled;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.CompanyModeStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: CompanyModeStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const CompanyModeStore: CompanyModeStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new CompanyModeStoreImpl());
