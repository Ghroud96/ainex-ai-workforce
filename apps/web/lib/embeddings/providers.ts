import type { EmbeddingProvider, EmbeddingVector } from "@/lib/embeddings/types";

function notImplemented(providerName: string): never {
  throw new Error(
    `${providerName} embedding provider is not implemented yet. Planned for a future phase — see ARCHITECTURE.md.`,
  );
}

export const openAiEmbeddingProvider: EmbeddingProvider = {
  name: "OpenAI",
  isImplemented: false,
  embed: async () => notImplemented("OpenAI"),
};

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
];

export const activeEmbeddingProvider: EmbeddingProvider = mockEmbeddingProvider;
