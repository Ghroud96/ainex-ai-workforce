import type { EmbeddingProvider, EmbeddingVector } from "@/lib/embeddings/types";

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_TIMEOUT_MS = 30000;

function mapOpenAiEmbeddingError(status: number, data: unknown): string {
  const message = (data as { error?: { message?: string } } | null)?.error?.message;

  if (status === 401) {
    return "OpenAI rejected the API key for embeddings. Check OPENAI_API_KEY in apps/web/.env.local.";
  }
  if (status === 429) {
    return "OpenAI embeddings quota exceeded or rate limit reached. Check your usage and billing, or try again later.";
  }
  if (status >= 500) {
    return "OpenAI embeddings are currently unavailable. Please try again shortly.";
  }
  return message ? `OpenAI embeddings request failed: ${message}` : "OpenAI embeddings request failed for an unknown reason.";
}

// The real embedding implementation behind the same EmbeddingProvider
// interface Sprint 4 defined. Kept in its own file (mirroring
// lib/llm/OpenAIProvider.ts) rather than inlined in providers.ts, since
// it owns real network/timeout/error-mapping logic the other, still-mock
// providers in that file don't.
export const openAiEmbeddingProvider: EmbeddingProvider = {
  name: "OpenAI",
  isImplemented: true,

  async embed(text: string): Promise<EmbeddingVector> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI embeddings are not configured. Set OPENAI_API_KEY in apps/web/.env.local to enable real embeddings.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_EMBEDDINGS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(mapOpenAiEmbeddingError(response.status, data));
      }

      const values: number[] | undefined = data?.data?.[0]?.embedding;
      if (!values) {
        throw new Error("OpenAI embeddings returned a response that could not be read.");
      }

      return { values, dimensions: values.length };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("The request to OpenAI embeddings timed out. Please try again.");
      }
      if (error instanceof Error) throw error;
      throw new Error("OpenAI embeddings are currently unavailable. Please try again shortly.");
    } finally {
      clearTimeout(timeout);
    }
  },
};
