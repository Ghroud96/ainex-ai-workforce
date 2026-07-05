import { getAllDocuments } from "@/data/documents";

// Mirrors lib/llm/{Provider,ProviderRegistry}.ts exactly: a small
// interface plus a string-keyed registry, one real implementation today,
// and a handful of registered-but-not-implemented entries proving the
// shape generalizes — the same pattern this codebase already uses to
// prove LLMProvider extends to Claude/Gemini without building them.
// Read-only decoration for the Company Intelligence Overview — nothing
// routes real data through this registry yet.
export interface CompanyIntelligenceSource {
  readonly id: string;
  readonly name: string;
  readonly isImplemented: boolean;
  documentCount(): number;
}

class CompanyIntelligenceRegistryImpl {
  private sources = new Map<string, CompanyIntelligenceSource>();

  register(source: CompanyIntelligenceSource): void {
    this.sources.set(source.id, source);
  }

  registerAll(sources: CompanyIntelligenceSource[]): void {
    sources.forEach((source) => this.register(source));
  }

  getAll(): CompanyIntelligenceSource[] {
    return Array.from(this.sources.values());
  }
}

function placeholderSource(id: string, name: string): CompanyIntelligenceSource {
  return { id, name, isImplemented: false, documentCount: () => 0 };
}

export const CompanyIntelligenceRegistry = new CompanyIntelligenceRegistryImpl();

CompanyIntelligenceRegistry.registerAll([
  {
    id: "manual-upload",
    name: "Manual Upload",
    isImplemented: true,
    documentCount: () => getAllDocuments().length,
  },
  placeholderSource("erp", "ERP"),
  placeholderSource("crm", "CRM"),
  placeholderSource("shopify", "Shopify"),
  placeholderSource("email", "Email"),
  placeholderSource("google-drive", "Google Drive"),
  placeholderSource("sharepoint", "SharePoint"),
  placeholderSource("whatsapp", "WhatsApp"),
  placeholderSource("sql", "SQL Database"),
]);
