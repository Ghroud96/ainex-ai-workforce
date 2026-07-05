import type { DigitalDocument } from "@/data/documents";

// A user's own uploaded documents — in-memory, resets on server restart,
// same demo-scoped pattern as lib/decisions/DecisionStore.ts. Kept
// independent of the current demo company (an upload is real user content,
// not part of the generated fiction), so it survives a company
// regeneration instead of being wiped by it. Anchored to globalThis for
// the same reason as lib/enterprise/CompanyProfileStore.ts: this store is
// written from a "use server" actions file and read from Server
// Components, which Next.js/Turbopack can compile as separate module
// graphs in dev.
class UploadedDocumentStoreImpl {
  private documents: DigitalDocument[] = [];

  add(document: DigitalDocument): void {
    this.documents = [document, ...this.documents];
  }

  getAll(): DigitalDocument[] {
    return this.documents;
  }
}

const GLOBAL_KEY = Symbol.for("ainex.UploadedDocumentStore");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: UploadedDocumentStoreImpl };

const globalWithStore = globalThis as GlobalWithStore;

export const UploadedDocumentStore: UploadedDocumentStoreImpl =
  globalWithStore[GLOBAL_KEY] ?? (globalWithStore[GLOBAL_KEY] = new UploadedDocumentStoreImpl());
