import { mockEmbeddingProvider } from "@/lib/embeddings/providers";
import type { EmbeddingVector } from "@/lib/embeddings/types";
import type { CostEstimate, LLMProvider } from "@/lib/llm/Provider";
import { hasCapability, type ProviderCapabilities, type ProviderCapabilityKey } from "@/lib/llm/ProviderCapability";
import type { ProviderConfig, ProviderId } from "@/lib/llm/ProviderConfig";
import type { ProviderContext } from "@/lib/llm/ProviderContext";
import { createHealthReport, type ProviderHealthReport } from "@/lib/llm/ProviderHealth";
import { listModelsForProvider, type ModelDescriptor } from "@/lib/llm/ProviderModels";
import { providerMetricsCollector } from "@/lib/llm/ProviderMetrics";
import type { ProviderChatRequest } from "@/lib/llm/ProviderRequest";
import type { ProviderResponse, ProviderStreamChunk } from "@/lib/llm/ProviderResponse";

// One reusable implementation parametrized per vendor, rather than seven
// near-identical classes. No network call, no API key, ever.
export class MockLLMProvider implements LLMProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  private config: ProviderConfig | null = null;

  constructor(providerId: ProviderId, name: string, capabilities: ProviderCapabilities) {
    this.id = providerId;
    this.name = name;
    this.capabilities = capabilities;
  }

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  async chat(request: ProviderChatRequest, context?: ProviderContext): Promise<ProviderResponse> {
    const lastMessage = request.messages[request.messages.length - 1];

    const response: ProviderResponse = {
      providerId: this.id,
      model: request.model || this.config?.defaultModel || "unknown",
      content: `[Mock ${this.name} response${context?.workerId ? ` for ${context.workerId}` : ""}] No real API call was made. Echoing: "${lastMessage?.content ?? ""}"`,
      finishReason: "stop",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      generatedAt: new Date().toISOString(),
    };

    providerMetricsCollector.record(this.id, { latencyMs: 0 });
    return response;
  }

  async *stream(request: ProviderChatRequest, context?: ProviderContext): AsyncIterable<ProviderStreamChunk> {
    const response = await this.chat(request, context);
    const words = response.content.split(" ");

    for (const word of words) {
      yield { providerId: this.id, model: response.model, delta: `${word} `, done: false };
    }

    yield { providerId: this.id, model: response.model, delta: "", done: true };
  }

  async embed(text: string): Promise<EmbeddingVector> {
    // Delegates to the existing Sprint 4 mock embedding logic instead of
    // duplicating a hashing implementation.
    return mockEmbeddingProvider.embed(text);
  }

  async health(): Promise<ProviderHealthReport> {
    return createHealthReport(this.id, "Offline", `${this.name} is a mock provider — no live connection exists.`);
  }

  listModels(): ModelDescriptor[] {
    return listModelsForProvider(this.id as ProviderId);
  }

  estimateCost(request: ProviderChatRequest): CostEstimate {
    return {
      providerId: this.id,
      model: request.model,
      estimatedCostUsd: 0,
      basis: "Mock provider — cost estimation is architecture only, no pricing table connected.",
    };
  }

  supports(capability: ProviderCapabilityKey): boolean {
    return hasCapability(this.capabilities, capability);
  }

  async shutdown(): Promise<void> {
    this.config = null;
  }
}

export interface MockProviderDefinition {
  id: ProviderId;
  name: string;
  capabilities: ProviderCapabilities;
}

export const MOCK_PROVIDER_DEFINITIONS: MockProviderDefinition[] = [
  {
    id: "openai",
    name: "OpenAI",
    capabilities: { chat: true, streaming: true, embeddings: true, vision: true, functionCalling: true, costEstimation: true },
  },
  {
    id: "claude",
    name: "Claude",
    capabilities: { chat: true, streaming: true, embeddings: false, vision: true, functionCalling: true, costEstimation: true },
  },
  {
    id: "gemini",
    name: "Gemini",
    capabilities: { chat: true, streaming: true, embeddings: true, vision: true, functionCalling: true, costEstimation: true },
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    capabilities: { chat: true, streaming: true, embeddings: true, vision: true, functionCalling: true, costEstimation: true },
  },
  {
    id: "ollama",
    name: "Ollama",
    capabilities: { chat: true, streaming: true, embeddings: true, vision: false, functionCalling: false, costEstimation: false },
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    capabilities: { chat: true, streaming: true, embeddings: false, vision: false, functionCalling: true, costEstimation: true },
  },
  {
    id: "lm-studio",
    name: "LM Studio",
    capabilities: { chat: true, streaming: true, embeddings: true, vision: false, functionCalling: false, costEstimation: false },
  },
];
