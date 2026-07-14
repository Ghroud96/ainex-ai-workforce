export interface SalesFollowUpCredentials {
  webhookUrl: string;
  sharedSecret?: string;
}

// Deliberately separate from lib/workflow/n8n/N8nCredentialConfig.ts's
// N8N_BASE_URL/N8N_API_KEY/N8N_WEBHOOK_SECRET — this is a different call
// site (a one-off, customer-specific action request with a callback, not a
// registered Workflow trigger) with its own env vars, so the two features
// don't become implicitly coupled. Read server-side only via process.env,
// the same guarantee OPENAI_API_KEY and N8N_BASE_URL already get.
export function getSalesFollowUpCredentials(): SalesFollowUpCredentials | null {
  const webhookUrl = process.env.N8N_FOLLOWUP_WEBHOOK_URL;
  if (!webhookUrl) return null;

  return {
    webhookUrl,
    sharedSecret: process.env.N8N_EXECUTION_SHARED_SECRET,
  };
}

export function isSalesFollowUpConfigured(): boolean {
  return getSalesFollowUpCredentials() !== null;
}
