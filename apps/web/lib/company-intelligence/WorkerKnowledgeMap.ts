import type { Department } from "@/data/departments";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import type { DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";

// Resolves a real mismatch already present in this codebase: worker
// identity/permissions are keyed by DepartmentWorkerId (EnterpriseUserTypes.ts),
// but DigitalDocument.department is a separate, narrower 9-value enum
// (data/departments.ts). Neither vocabulary was designed with the other in
// mind, so this is the one place that bridges them — used both for
// deriving an uploaded document's usedBy list (app/knowledge/actions.ts)
// and for automatic per-worker relevance matching (RelevantKnowledge.ts).
export const WORKER_DOCUMENT_DEPARTMENTS: Record<DepartmentWorkerId, Department[]> = {
  executive: ["Executive"],
  sales: ["Sales"],
  finance: ["Finance"],
  inventory: ["Warehouse", "Operations"],
  hr: ["HR"],
  "customer-support": ["Customer Support"],
  operations: ["Operations"],
  marketing: ["Marketing"],
  procurement: ["Warehouse"],
  compliance: ["Executive"],
};

// The reverse direction — given a document's own department, which real
// worker names should see it. Used at upload time so a customer's
// uploaded document becomes usable Company Intelligence immediately, with
// no manual "usedBy" tagging step (app/knowledge/actions.ts).
export function deriveUsedByForDepartment(department: Department): string[] {
  const workerIds = (Object.keys(WORKER_DOCUMENT_DEPARTMENTS) as DepartmentWorkerId[]).filter((workerId) =>
    WORKER_DOCUMENT_DEPARTMENTS[workerId].includes(department),
  );
  return workerIds.map((workerId) => WORKER_NAMES_BY_ID[workerId]).filter((name): name is string => Boolean(name));
}
