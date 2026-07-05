import { openAiEmbeddingProvider } from "@/lib/embeddings/OpenAIEmbeddingProvider";
import type { EmbeddingProvider, EmbeddingVector } from "@/lib/embeddings/types";

export { openAiEmbeddingProvider };

function notImplemented(providerName: string): never {
  throw new Error(
    `${providerName} embedding provider is not implemented yet. Planned for a future phase — see ARCHITECTURE.md.`,
  );
}

export const geminiEmbeddingProvider: EmbeddingProvider = {
  name: "Gemini",
  isImplemented: false,
  embed: async () => notImplemented("Gemini"),
};

export const claudeEmbeddingProvider: EmbeddingProvider = {
  name: "Claude",
  isImplemented: false,
  embed: async () => notImplemented("Claude"),
};

export const ollamaEmbeddingProvider: EmbeddingProvider = {
  name: "Ollama",
  isImplemented: false,
  embed: async () => notImplemented("Ollama"),
};

export const azureOpenAiEmbeddingProvider: EmbeddingProvider = {
  name: "Azure OpenAI",
  isImplemented: false,
  embed: async () => notImplemented("Azure OpenAI"),
};

export const openRouterEmbeddingProvider: EmbeddingProvider = {
  name: "OpenRouter",
  isImplemented: false,
  embed: async () => notImplemented("OpenRouter"),
};

const MOCK_DIMENSIONS = 8;

// No real provider is wired this sprint. This deterministic, non-AI hash
// keeps the pipeline (embed → index → retrieve) runnable end-to-end so the
// architecture above it can be demonstrated without any external call.
export const mockEmbeddingProvider: EmbeddingProvider = {
  name: "Mock",
  isImplemented: true,
  embed: async (text: string): Promise<EmbeddingVector> => {
    const values = Array.from({ length: MOCK_DIMENSIONS }, (_, dimension) => {
      let hash = 0;
      for (let charIndex = dimension; charIndex < text.length; charIndex += MOCK_DIMENSIONS) {
        hash = (hash * 31 + text.charCodeAt(charIndex)) % 1000;
      }
      return hash / 1000;
    });

    return { values, dimensions: MOCK_DIMENSIONS };
  },
};

export const embeddingProviders: EmbeddingProvider[] = [
  mockEmbeddingProvider,
  openAiEmbeddingProvider,
  geminiEmbeddingProvider,
  claudeEmbeddingProvider,
  ollamaEmbeddingProvider,
  azureOpenAiEmbeddingProvider,
  openRouterEmbeddingProvider,
];

// Best-effort, not per-request-isolated: sets synchronously whenever
// resilientEmbeddingProvider.embed() resolves, so a caller that awaits an
// embed/search call and checks this immediately after (e.g.
// ProductionRagService) reads an accurate result for that call in
// practice. Under genuinely concurrent requests two in-flight calls could
// interleave and one could read the other's outcome — acceptable for
// today's single-process, single-tenant scope (see CLAUDE.md — multi-
// tenancy is explicitly out of scope this phase); a future phase should
// thread this through the retrieval return value instead once concurrent
// load matters.
export let lastEmbeddingUsedFallback = false;

// Phase C4: tries the real provider first; if it throws for any reason
// (missing key, quota, network, timeout — all real, not simulated
// failure modes) it falls back to the deterministic mock so the
// Knowledge Pipeline (chunk → embed → index → retrieve) never breaks
// just because a provider account is unconfigured or rate-limited. The
// warning is logged, not swallowed silently.
export const resilientEmbeddingProvider: EmbeddingProvider = {
  name: "OpenAI (mock fallback)",
  isImplemented: true,
  async embed(text: string): Promise<EmbeddingVector> {
    try {
      const result = await openAiEmbeddingProvider.embed(text);
      lastEmbeddingUsedFallback = false;
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown error";
      console.warn(`OpenAI embeddings unavailable (${reason}) — falling back to mock embeddings.`);
      lastEmbeddingUsedFallback = true;
      return mockEmbeddingProvider.embed(text);
    }
  },
};

export const activeEmbeddingProvider: EmbeddingProvider = resilientEmbeddingProvider;
