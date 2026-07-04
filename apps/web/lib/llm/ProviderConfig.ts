export type ProviderId =
  | "openai"
  | "claude"
  | "gemini"
  | "azure-openai"
  | "ollama"
  | "openrouter"
  | "lm-studio";

export interface ProviderConfig {
  providerId: ProviderId;
  displayName: string;
  defaultModel: string;
  baseUrl?: string;
  // Name of the environment variable a real provider would read a key
  // from — never the key itself. Nothing in this phase reads it.
  apiKeyEnvVar?: string;
  timeoutMs?: number;
}

// Descriptive configuration only — no credentials, no network calls.
export const DEFAULT_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    providerId: "openai",
    displayName: "OpenAI",
    defaultModel: "gpt-4.1-mini",
    apiKeyEnvVar: "OPENAI_API_KEY",
    timeoutMs: 30000,
  },
  {
    providerId: "claude",
    displayName: "Claude",
    defaultModel: "claude-sonnet",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    timeoutMs: 30000,
  },
  {
    providerId: "gemini",
    displayName: "Gemini",
    defaultModel: "gemini-pro",
    apiKeyEnvVar: "GEMINI_API_KEY",
    timeoutMs: 30000,
  },
  {
    providerId: "azure-openai",
    displayName: "Azure OpenAI",
    defaultModel: "gpt-4o",
    apiKeyEnvVar: "AZURE_OPENAI_API_KEY",
    baseUrl: "https://<resource>.openai.azure.com",
    timeoutMs: 30000,
  },
  {
    providerId: "ollama",
    displayName: "Ollama",
    defaultModel: "llama-3",
    baseUrl: "http://localhost:11434",
    timeoutMs: 60000,
  },
  {
    providerId: "openrouter",
    displayName: "OpenRouter",
    defaultModel: "deepseek",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    timeoutMs: 30000,
  },
  {
    providerId: "lm-studio",
    displayName: "LM Studio",
    defaultModel: "llama-3",
    baseUrl: "http://localhost:1234",
    timeoutMs: 60000,
  },
];
