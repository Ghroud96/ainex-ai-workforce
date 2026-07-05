import { getN8nCredentials } from "@/lib/workflow/n8n/N8nCredentialConfig";
import { mapN8nError, mapN8nNetworkError } from "@/lib/workflow/n8n/N8nErrorMapper";

const DEFAULT_TIMEOUT_MS = 15000;

export interface N8nWebhookResponse {
  executionId: string;
  status: string;
  data?: unknown;
}

// A real HTTP client against n8n's webhook API — implemented, but only
// ever called by N8nWorkflowProvider when isN8nConfigured() is true.
// This has not been exercised against a live n8n instance (see
// docs/architecture/n8n-integration.md) — the local n8n container
// (docker-compose.yml) has no API key configured for it, and this phase
// explicitly does not require real credentials.
export async function callN8nWebhook(
  workflowId: string,
  payload: Record<string, unknown>,
): Promise<N8nWebhookResponse> {
  const credentials = getN8nCredentials();
  if (!credentials) {
    throw new Error("n8n is not configured. Set N8N_BASE_URL in apps/web/.env.local to enable real workflow runs.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (credentials.apiKey) headers["X-N8N-API-KEY"] = credentials.apiKey;
    if (credentials.webhookSecret) headers["X-N8N-Webhook-Secret"] = credentials.webhookSecret;

    const response = await fetch(`${credentials.baseUrl}/webhook/${workflowId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(mapN8nError(response.status, data));
    }

    return data as N8nWebhookResponse;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("n8n")) throw error;
    throw new Error(mapN8nNetworkError(error));
  } finally {
    clearTimeout(timeout);
  }
}
