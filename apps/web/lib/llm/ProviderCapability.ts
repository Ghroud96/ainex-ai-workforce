export type ProviderCapabilityKey =
  | "chat"
  | "streaming"
  | "embeddings"
  | "vision"
  | "function-calling"
  | "cost-estimation";

export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  embeddings: boolean;
  vision: boolean;
  functionCalling: boolean;
  costEstimation: boolean;
}

// Shared by every LLMProvider implementation's supports() method so the
// key-to-flag mapping exists in exactly one place.
export function hasCapability(capabilities: ProviderCapabilities, key: ProviderCapabilityKey): boolean {
  switch (key) {
    case "chat":
      return capabilities.chat;
    case "streaming":
      return capabilities.streaming;
    case "embeddings":
      return capabilities.embeddings;
    case "vision":
      return capabilities.vision;
    case "function-calling":
      return capabilities.functionCalling;
    case "cost-estimation":
      return capabilities.costEstimation;
    default:
      return false;
  }
}
