import type { PromptTemplate } from "@/lib/workforce/WorkerTypes";

export interface PromptTemplateInput {
  id: string;
  name: string;
  purpose: string;
  businessValue: string;
  knowledgeSources: string[];
}

// Each worker owns its own prompt template. This is string construction
// only — no provider is called, and no template is sent anywhere yet.
export function buildPromptTemplate(worker: PromptTemplateInput): PromptTemplate {
  return {
    workerId: worker.id,
    systemPrompt: `You are the ${worker.name}. ${worker.purpose}`,
    instructions: [
      `Answer only using knowledge from: ${
        worker.knowledgeSources.length > 0 ? worker.knowledgeSources.join(", ") : "no connected sources yet"
      }.`,
      `Business value you provide: ${worker.businessValue}`,
      "Escalate to a human when a request falls outside your defined capabilities.",
    ],
  };
}
