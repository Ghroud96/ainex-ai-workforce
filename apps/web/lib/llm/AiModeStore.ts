// The one switch that decides whether the one real provider (OpenAI) is
// ever allowed to make a network call. Defaults to false regardless of
// whether OPENAI_API_KEY is set — an admin's env var being present must
// never be the thing that silently turns on real spending; only an
// explicit, later opt-in (a future Settings toggle) should. Anchored to
// globalThis for the same reason as lib/enterprise/CompanyProfileStore.ts:
// Next.js/Turbopack can compile Server Actions and Server Components as
// separate module graphs, so a plain module-level singleton can silently
// end up as two different objects.
class AiModeStoreImpl {
  private liveModeEnabled = false;

  isLiveModeEnabled(): boolean {
    return this.liveModeEnabled;
  }

  setLiveModeEnabled(enabled: boolean): void {
    this.liveModeEnabled = enabled;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.AiModeStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: AiModeStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const AiModeStore: AiModeStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new AiModeStoreImpl());
