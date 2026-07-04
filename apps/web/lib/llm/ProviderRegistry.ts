import { DEFAULT_PROVIDER_CONFIGS } from "@/lib/llm/ProviderConfig";
import { ProviderFactory } from "@/lib/llm/ProviderFactory";
import type { LLMProvider } from "@/lib/llm/Provider";

class ProviderRegistryImpl {
  private providers = new Map<string, LLMProvider>();
  private activeProviderId: string | null = null;

  constructor(initialProviders: LLMProvider[]) {
    this.registerAll(initialProviders);
  }

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
    if (!this.activeProviderId) {
      this.activeProviderId = provider.id;
    }
  }

  registerAll(providers: LLMProvider[]): void {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  unregister(id: string): void {
    this.providers.delete(id);
    if (this.activeProviderId === id) {
      this.activeProviderId = this.providers.keys().next().value ?? null;
    }
  }

  getAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  getById(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  // Lets the active provider change at runtime — a worker (or anything
  // else) that already holds a reference to the registry automatically
  // starts using the new provider with no code change on its side.
  setActive(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(`Cannot activate unknown provider "${id}".`);
    }
    this.activeProviderId = id;
  }

  getActive(): LLMProvider | undefined {
    return this.activeProviderId ? this.providers.get(this.activeProviderId) : undefined;
  }

  count(): number {
    return this.providers.size;
  }
}

function bootstrap(): LLMProvider[] {
  return DEFAULT_PROVIDER_CONFIGS.map((config) => {
    const provider = ProviderFactory.create(config);
    void provider.initialize(config);
    return provider;
  });
}

// A singleton so every future consumer (Worker Engine, a future Reasoning
// Engine) shares one set of registered providers and one active provider.
export const ProviderRegistry = new ProviderRegistryImpl(bootstrap());
