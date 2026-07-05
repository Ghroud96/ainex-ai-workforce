// Mirrors mapOpenAiError (lib/llm/OpenAIProvider.ts) and the Qdrant error
// handling in lib/vector/stores.ts — the same friendly, specific,
// never-a-raw-stack-trace pattern used for every other external call in
// this codebase.
export function mapN8nError(status: number, data: unknown): string {
  const message = (data as { message?: string } | null)?.message;

  if (status === 401 || status === 403) {
    return "n8n rejected the API key or webhook secret. Check N8N_API_KEY / N8N_WEBHOOK_SECRET in apps/web/.env.local.";
  }
  if (status === 404) {
    return "n8n could not find the requested workflow or webhook. Check that it's active in the n8n instance.";
  }
  if (status >= 500) {
    return "n8n is currently unavailable. Please try again shortly.";
  }

  return message ? `n8n request failed: ${message}` : "n8n request failed for an unknown reason.";
}

export function mapN8nNetworkError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "The request to n8n timed out. Please try again.";
  }
  return "n8n is currently unreachable. Check N8N_BASE_URL in apps/web/.env.local.";
}
