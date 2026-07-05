"use server";

import { revalidatePath } from "next/cache";
import { DecisionStore } from "@/lib/decisions/DecisionStore";

export async function approveDecision(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  DecisionStore.approve(id);
  revalidatePath("/decisions");
}

export async function rejectDecision(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  DecisionStore.reject(id);
  revalidatePath("/decisions");
}
