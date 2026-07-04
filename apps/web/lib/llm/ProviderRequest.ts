export type ProviderMessageRole = "system" | "user" | "assistant";

export interface ProviderMessage {
  role: ProviderMessageRole;
  content: string;
}

export interface ProviderChatRequest {
  model: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  workerId?: string;
}
