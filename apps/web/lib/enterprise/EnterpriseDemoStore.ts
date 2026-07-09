// Which deal is the featured opportunity for the current Enterprise Demo
// walkthrough (see lib/enterprise/EnterpriseDemoEngine.ts) — the one piece
// of state the whole guided presentation is built on. Deliberately a
// single pointer, not a bag of "story progress" fields: everything else
// (which of the 5 screens is current, what the presenter should see) is
// derived fresh from the featured deal's real stage and other stores that
// already exist, never tracked separately. Same globalThis-anchored
// pattern as every other store in this app.
class EnterpriseDemoStoreImpl {
  private featuredDealId: string | null = null;
  private startedAt: string | null = null;

  start(dealId: string): void {
    this.featuredDealId = dealId;
    this.startedAt = new Date().toISOString();
  }

  getFeaturedDealId(): string | null {
    return this.featuredDealId;
  }

  isStarted(): boolean {
    return this.featuredDealId !== null;
  }

  // Called whenever the underlying company regenerates (see
  // CompanyProfileStore.setSelection()) — a new company means a whole new
  // set of deal ids, so a dangling featuredDealId would point at nothing.
  reset(): void {
    this.featuredDealId = null;
    this.startedAt = null;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.EnterpriseDemoStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: EnterpriseDemoStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const EnterpriseDemoStore: EnterpriseDemoStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new EnterpriseDemoStoreImpl());
