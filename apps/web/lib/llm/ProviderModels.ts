import type { ProviderId } from "@/lib/llm/ProviderConfig";

export type ModelFamily = "gpt" | "claude" | "gemini" | "llama" | "mistral" | "deepseek";

export interface ModelDescriptor {
  id: string;
  displayName: string;
  providerId: ProviderId;
  family: ModelFamily;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
}

// The known model catalog today. registerModel() lets a future provider
// add to this list without editing this file.
//
// "gpt-4.1-mini" is listed first deliberately: it's the model the real
// OpenAIProvider (Phase C1) is verified to work with, so any caller that
// picks `listModelsForProvider("openai")[0]` (e.g. RAGService) gets a
// model that's actually callable, not just an aspirational catalog entry.
export const MODEL_REGISTRY: ModelDescriptor[] = [
  {
    id: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    providerId: "openai",
    family: "gpt",
    contextWindow: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  {
    id: "gpt-4.1",
    displayName: "GPT-4.1",
    providerId: "openai",
    family: "gpt",
    contextWindow: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    providerId: "openai",
    family: "gpt",
    contextWindow: 128_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  {
    id: "gpt-5",
    displayName: "GPT-5",
    providerId: "openai",
    family: "gpt",
    contextWindow: 256_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  {
    id: "claude-sonnet",
    displayName: "Claude Sonnet",
    providerId: "claude",
    family: "claude",
    contextWindow: 200_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  {
    id: "claude-opus",
    displayName: "Claude Opus",
    providerId: "claude",
    family: "claude",
    contextWindow: 200_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
  {
    id: "gemini-pro",
    displayName: "Gemini Pro",
    providerId: "gemini",
    family: "gemini",
    contextWindow: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
  {
    id: "gemini-flash",
    displayName: "Gemini Flash",
    providerId: "gemini",
    family: "gemini",
    contextWindow: 1_000_000,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
  {
    id: "llama-3",
    displayName: "Llama 3",
    providerId: "ollama",
    family: "llama",
    contextWindow: 128_000,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
  {
    id: "mistral",
    displayName: "Mistral",
    providerId: "ollama",
    family: "mistral",
    contextWindow: 32_000,
    supportsStreaming: true,
    supportsEmbeddings: true,
  },
  {
    id: "deepseek",
    displayName: "DeepSeek",
    providerId: "openrouter",
    family: "deepseek",
    contextWindow: 64_000,
    supportsStreaming: true,
    supportsEmbeddings: false,
  },
];

export function registerModel(model: ModelDescriptor): void {
  MODEL_REGISTRY.push(model);
}

export function listModelsForProvider(providerId: ProviderId): ModelDescriptor[] {
  return MODEL_REGISTRY.filter((model) => model.providerId === providerId);
}

export function getModel(id: string): ModelDescriptor | undefined {
  return MODEL_REGISTRY.find((model) => model.id === id);
}
