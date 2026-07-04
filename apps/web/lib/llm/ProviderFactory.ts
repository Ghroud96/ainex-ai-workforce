import { MOCK_PROVIDER_DEFINITIONS, MockLLMProvider } from "@/lib/llm/MockProviders";
import { OpenAIProvider } from "@/lib/llm/OpenAIProvider";
import type { LLMProvider } from "@/lib/llm/Provider";
import type { ProviderConfig } from "@/lib/llm/ProviderConfig";

// The only place a provider is ever constructed. Nothing else in the
// codebase should call `new MockLLMProvider(...)` or `new OpenAIProvider(...)`
// directly — always go through this factory.
//
// "openai" is the one real provider (Phase C1) — every other provider id
// still resolves to the Phase B mock. This is exactly the extension point
// Phase B's own docs anticipated: swapping a provider from mock to real
// requires no change anywhere that calls ProviderRegistry.getActive().
export const ProviderFactory = {
  create(config: ProviderConfig): LLMProvider {
    if (config.providerId === "openai") {
      return new OpenAIProvider();
    }

    const definition = MOCK_PROVIDER_DEFINITIONS.find((candidate) => candidate.id === config.providerId);

    if (!definition) {
      throw new Error(`No provider definition registered for "${config.providerId}".`);
    }

    return new MockLLMProvider(definition.id, definition.name, definition.capabilities);
  },

  createAll(configs: ProviderConfig[]): LLMProvider[] {
    return configs.map((config) => this.create(config));
  },
};
