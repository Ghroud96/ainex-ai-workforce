import { getSalesFollowUpCredentials } from "@/lib/sales/execution/SalesFollowUpCredentials";
import type { SalesFollowUpExecutionPayload } from "@/lib/sales/execution/SalesFollowUpTypes";

const DEFAULT_TIMEOUT_MS = 15000;

// A real HTTP client against the configured n8n webhook — only ever called
// when isSalesFollowUpConfigured() is true. Mirrors
// lib/workflow/n8n/N8nWebhookClient.ts's fetch/AbortController/header
// shape. The response is only used to confirm n8n accepted the job (the
// caller moves the record to "processing"); it is never treated as the
// final result — SalesFollowUpExecutionService.handleCallback() is the
// only path that resolves a record to succeeded/failed.
export async function sendFollowUpExecution(payload: SalesFollowUpExecutionPayload): Promise<void> {
  const credentials = getSalesFollowUpCredentials();
  if (!credentials) {
    throw new Error("The follow-up execution layer is not configured. Set N8N_FOLLOWUP_WEBHOOK_URL to enable real sends.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (credentials.sharedSecret) headers["X-AINEX-Shared-Secret"] = credentials.sharedSecret;

    const response = await fetch(credentials.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`The follow-up service rejected the request (status ${response.status}).`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The request to the follow-up service timed out.");
    }
    if (error instanceof Error && error.message.startsWith("The follow-up")) throw error;
    throw new Error("The follow-up service is currently unreachable.");
  } finally {
    clearTimeout(timeout);
  }
}
