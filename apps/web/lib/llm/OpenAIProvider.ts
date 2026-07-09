import { AiModeStore } from "@/lib/llm/AiModeStore";
import { hasCapability, type ProviderCapabilities, type ProviderCapabilityKey } from "@/lib/llm/ProviderCapability";
import type { ProviderConfig } from "@/lib/llm/ProviderConfig";
import type { ProviderContext } from "@/lib/llm/ProviderContext";
import { createHealthReport, type ProviderHealthReport } from "@/lib/llm/ProviderHealth";
import { listModelsForProvider, type ModelDescriptor } from "@/lib/llm/ProviderModels";
import { providerMetricsCollector } from "@/lib/llm/ProviderMetrics";
import type { CostEstimate, LLMProvider } from "@/lib/llm/Provider";
import type { ProviderChatRequest } from "@/lib/llm/ProviderRequest";
import type { ProviderResponse, ProviderStreamChunk } from "@/lib/llm/ProviderResponse";
import { openAiEmbeddingProvider } from "@/lib/embeddings/OpenAIEmbeddingProvider";
import type { EmbeddingVector } from "@/lib/embeddings/types";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const DEFAULT_TIMEOUT_MS = 30000;

const CAPABILITIES: ProviderCapabilities = {
  chat: true,
  streaming: true,
  embeddings: true,
  vision: false,
  functionCalling: false,
  costEstimation: false,
};

function errorResponse(model: string, message: string): ProviderResponse {
  return {
    providerId: "openai",
    model,
    content: message,
    finishReason: "error",
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    generatedAt: new Date().toISOString(),
  };
}

// A deliberate, honest stand-in — not an error — for when Live Mode is off
// (the default). finishReason "stop" so callers treat this as a normal,
// successful demo answer rather than a failure to handle.
function demoModeResponse(model: string): ProviderResponse {
  return {
    providerId: "openai",
    model,
    content: "AINEX is running in Demo Mode. Turn on Live AI in Settings for a real AI-generated response.",
    finishReason: "stop",
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function mapOpenAiError(status: number, data: unknown): string {
  const message = (data as { error?: { message?: string } } | null)?.error?.message;

  if (status === 401) {
    return "OpenAI rejected the API key. Check OPENAI_API_KEY in apps/web/.env.local.";
  }
  if (status === 429) {
    return "OpenAI quota exceeded or rate limit reached. Check your usage and billing, or try again later.";
  }
  if (status >= 500) {
    return "OpenAI is currently unavailable. Please try again shortly.";
  }

  return message ? `OpenAI request failed: ${message}` : "OpenAI request failed for an unknown reason.";
}

// The one real provider in this codebase. Every other provider (Claude,
// Gemini, Azure OpenAI, Ollama, OpenRouter, LM Studio) stays mocked — see
// lib/llm/MockProviders.ts. The API key is read server-side only via
// process.env and is never included in any ProviderResponse, so it can
// never reach a client.
export class OpenAIProvider implements LLMProvider {
  readonly id = "openai";
  readonly name = "OpenAI";
  readonly capabilities = CAPABILITIES;

  private config: ProviderConfig | null = null;

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
  }

  async chat(request: ProviderChatRequest, context?: ProviderContext): Promise<ProviderResponse> {
    const model = request.model && request.model !== "unknown" ? request.model : this.config?.defaultModel ?? DEFAULT_MODEL;

    if (!AiModeStore.isLiveModeEnabled()) {
      return demoModeResponse(model);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const traceTag = context?.requestId ? ` (requestId: ${context.requestId})` : "";

    if (!apiKey) {
      return errorResponse(
        model,
        "OpenAI is not configured. Set OPENAI_API_KEY in apps/web/.env.local to enable real responses.",
      );
    }

    const controller = new AbortController();
    const timeoutMs = this.config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: request.messages.map((message) => ({ role: message.role, content: message.content })),
        }),
        signal: controller.signal,
      });

      // Some failure responses (e.g., an edge/CDN rate-limit block) return
      // an HTML page instead of JSON — classify by HTTP status even when
      // the body can't be parsed, instead of letting the parse failure
      // fall through to the generic catch-all below.
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return errorResponse(model, mapOpenAiError(response.status, data));
      }

      if (!data) {
        return errorResponse(model, "OpenAI returned a response that could not be read. Please try again.");
      }

      const text: string =
        data.output_text ||
        data.output?.[0]?.content?.[0]?.text ||
        data.output?.[1]?.content?.[0]?.text ||
        "No response generated.";

      providerMetricsCollector.record(this.id, { latencyMs: 0 });

      return {
        providerId: this.id,
        model,
        content: text,
        finishReason: "stop",
        usage: {
          promptTokens: data.usage?.input_tokens ?? 0,
          completionTokens: data.usage?.output_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? 0,
        },
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.error(`OpenAI request timed out${traceTag}.`);
        return errorResponse(model, "The request to OpenAI timed out. Please try again.");
      }
      console.error(`OpenAI request failed${traceTag}:`, error);
      return errorResponse(model, "OpenAI is currently unavailable. Please try again shortly.");
    } finally {
      clearTimeout(timeout);
    }
  }

  async *stream(request: ProviderChatRequest, context?: ProviderContext): AsyncIterable<ProviderStreamChunk> {
    // Real token-by-token streaming (SSE) is a future phase. This chunks
    // the completed response so a streaming consumer can already be
    // built against a real async iterator today.
    const response = await this.chat(request, context);
    const words = response.content.split(" ");

    for (const word of words) {
      yield { providerId: this.id, model: response.model, delta: `${word} `, done: false };
    }

    yield { providerId: this.id, model: response.model, delta: "", done: true };
  }

  async embed(text: string): Promise<EmbeddingVector> {
    // Delegates to the same EmbeddingProvider the Knowledge Pipeline uses
    // (lib/embeddings/OpenAIEmbeddingProvider.ts) rather than a second,
    // duplicate implementation — this method exists so LLMProvider is a
    // complete interface, but lib/retriever and lib/services/IndexService
    // call the embeddings module directly, not this one.
    return openAiEmbeddingProvider.embed(text);
  }

  async health(): Promise<ProviderHealthReport> {
    const configured = Boolean(process.env.OPENAI_API_KEY);

    return createHealthReport(
      this.id,
      configured ? "Online" : "Offline",
      configured
        ? "OPENAI_API_KEY is configured. Connectivity is not verified until a request is made."
        : "OPENAI_API_KEY is not set — requests will return a friendly configuration error.",
    );
  }

  listModels(): ModelDescriptor[] {
    return listModelsForProvider("openai");
  }

  estimateCost(request: ProviderChatRequest): CostEstimate {
    return {
      providerId: this.id,
      model: request.model,
      estimatedCostUsd: 0,
      basis: "Real cost estimation requires a configured OpenAI pricing table, not yet implemented.",
    };
  }

  supports(capability: ProviderCapabilityKey): boolean {
    return hasCapability(this.capabilities, capability);
  }

  async shutdown(): Promise<void> {
    this.config = null;
  }
}
