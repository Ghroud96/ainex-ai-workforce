import type { ProviderMessage } from "@/lib/llm/ProviderRequest";

export type PromptSectionId = "system" | "knowledge" | "memory" | "history" | "user";

export interface PromptSection {
  id: PromptSectionId;
  title: string;
  content: string;
}

export interface CompiledPrompt {
  workerId: string;
  sections: PromptSection[];
  messages: ProviderMessage[];
}
