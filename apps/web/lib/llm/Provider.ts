import type { EmbeddingVector } from "@/lib/embeddings/types";
import type { ProviderCapabilities, ProviderCapabilityKey } from "@/lib/llm/ProviderCapability";
import type { ProviderConfig } from "@/lib/llm/ProviderConfig";
import type { ProviderContext } from "@/lib/llm/ProviderContext";
import type { ProviderHealthReport } from "@/lib/llm/ProviderHealth";
import type { ModelDescriptor } from "@/lib/llm/ProviderModels";
import type { ProviderChatRequest } from "@/lib/llm/ProviderRequest";
import type { ProviderResponse, ProviderStreamChunk } from "@/lib/llm/ProviderResponse";

export interface CostEstimate {
  providerId: string;
  model: string;
  estimatedCostUsd: number;
  basis: string;
}

// Every AI provider AINEX ever connects to — real or mock — implements
// this interface. A worker (or anything else in the codebase) that holds
// an `LLMProvider` can never tell which vendor is behind it.
export interface LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  initialize(config: ProviderConfig): Promise<void>;
  chat(request: ProviderChatRequest, context?: ProviderContext): Promise<ProviderResponse>;
  stream(request: ProviderChatRequest, context?: ProviderContext): AsyncIterable<ProviderStreamChunk>;
  embed(text: string): Promise<EmbeddingVector>;
  health(): Promise<ProviderHealthReport>;
  listModels(): ModelDescriptor[];
  estimateCost(request: ProviderChatRequest): CostEstimate;
  supports(capability: ProviderCapabilityKey): boolean;
  shutdown(): Promise<void>;
}
