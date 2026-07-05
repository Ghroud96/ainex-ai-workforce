export interface N8nCredentials {
  baseUrl: string;
  apiKey?: string;
  webhookSecret?: string;
}

// Every field is read server-side only, via process.env — never exposed
// to the client, the same guarantee OPENAI_API_KEY gets in
// lib/llm/OpenAIProvider.ts. All three are optional at the environment
// level (see .env.local) — this phase explicitly does not require real
// n8n credentials.
export function getN8nCredentials(): N8nCredentials | null {
  const baseUrl = process.env.N8N_BASE_URL;
  if (!baseUrl) return null;

  return {
    baseUrl,
    apiKey: process.env.N8N_API_KEY,
    webhookSecret: process.env.N8N_WEBHOOK_SECRET,
  };
}

export function isN8nConfigured(): boolean {
  return getN8nCredentials() !== null;
}
