"use server";

import { revalidatePath } from "next/cache";
import { getDocumentById } from "@/data/documents";
import { CompanyModeStore } from "@/lib/enterprise/CompanyModeStore";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { resolveCurrentUser } from "@/lib/enterprise/CurrentUserStore";
import { canAccessWorker, WORKER_IDS, type DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { analyzeDocumentForWorker, type PersonaId } from "@/lib/services/knowledge/WorkerAnalysisService";
import { WorkerAnalysisResultStore } from "@/lib/services/knowledge/WorkerAnalysisResultStore";

const VALID_PERSONA_IDS: PersonaId[] = ["executive", "sales", "executive-assistant", "finance", "inventory", "hr"];

function isPersonaId(value: FormDataEntryValue | null): value is PersonaId {
  return typeof value === "string" && (VALID_PERSONA_IDS as string[]).includes(value);
}

function isDepartmentWorkerId(value: string): value is DepartmentWorkerId {
  return (WORKER_IDS as readonly string[]).includes(value);
}

// The only place this feature's AI calls ever fire — a user-submitted
// form, never automatic, never on page load. One document + one persona
// per call, matching the "one document + one worker per AI request" rule.
export async function analyzeDocumentAsWorker(formData: FormData): Promise<void> {
  const personaId = formData.get("personaId");
  const documentId = formData.get("documentId");
  const workerId = formData.get("workerId");

  if (!isPersonaId(personaId)) {
    throw new Error("A valid persona is required.");
  }
  if (typeof documentId !== "string" || documentId.trim().length === 0) {
    throw new Error("A document is required.");
  }
  if (typeof workerId !== "string" || workerId.trim().length === 0) {
    throw new Error("Missing worker context.");
  }

  const document = getDocumentById(documentId);
  if (!document) {
    throw new Error("Selected document could not be found.");
  }

  const { company } = CompanyProfileStore.getCurrent();
  const currentUser = resolveCurrentUser(company);

  // Server-side enforcement backstop — the UI already hides the Analyze
  // form for a disallowed user, but this Server Action is the real trust
  // boundary, so execution is blocked here too, not just hidden client-side.
  if (isDepartmentWorkerId(workerId) && !canAccessWorker(currentUser, workerId) && !CompanyModeStore.isDemoModeEnabled()) {
    throw new Error("You do not have permission to execute this Digital Worker.");
  }

  const result = await analyzeDocumentForWorker(personaId, document, company, currentUser);

  WorkerAnalysisResultStore.set(personaId, result);
  revalidatePath(`/workforce/${workerId}`);
}
