"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PresentationModeStore, type PresentationRole } from "@/lib/enterprise/PresentationModeStore";

const VALID_ROLES: PresentationRole[] = ["sales-rep", "sales-manager", "finance", "executive"];

// The only place the "Presenting:" lens can be switched — a presentation
// convenience, never a real identity or permission change (see
// app/users/actions.ts::switchCurrentUser for that). See
// lib/enterprise/PresentationModeStore.ts for why this exists.
//
// An optional `redirectTo` field lets a "Continue to X Review" link
// (components/WorkflowStepPanel.tsx) switch the lens and land on the
// right view in one click, rather than requiring the presenter to also
// find the Sidebar switcher themselves.
export async function setPresentationRole(formData: FormData): Promise<void> {
  const role = formData.get("role");

  if (typeof role !== "string" || !VALID_ROLES.includes(role as PresentationRole)) {
    throw new Error("A presentation role is required.");
  }

  PresentationModeStore.set(role as PresentationRole);
  revalidatePath("/", "layout");

  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.length > 0) {
    redirect(redirectTo);
  }
}
