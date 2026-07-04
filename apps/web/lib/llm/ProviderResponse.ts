export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type ProviderFinishReason = "stop" | "length" | "error";

export interface ProviderResponse {
  providerId: string;
  model: string;
  content: string;
  finishReason: ProviderFinishReason;
  usage: TokenUsage;
  generatedAt: string;
}

export interface ProviderStreamChunk {
  providerId: string;
  model: string;
  delta: string;
  done: boolean;
}
