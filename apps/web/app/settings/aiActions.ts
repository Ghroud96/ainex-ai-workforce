"use server";

import { revalidatePath } from "next/cache";
import { AiModeStore } from "@/lib/llm/AiModeStore";

// The only place Live AI Mode can be turned on — a deliberate, visible
// Settings action, never a default. Reuses AiModeStore exactly as it
// already is; this file only flips the one flag it already exposes.
export async function setLiveAiMode(formData: FormData): Promise<void> {
  const enabled = formData.get("enabled") === "true";

  AiModeStore.setLiveModeEnabled(enabled);
  revalidatePath("/", "layout");
}
