import { buildCompiledPrompt } from "@/lib/prompt/PromptBuilder";
import type { CompiledPrompt } from "@/lib/prompt/PromptTypes";
import type { KnowledgeContext } from "@/lib/rag/RAGTypes";
import type { WorkerInstance } from "@/lib/workforce/Worker";
import type { ConversationTurn, WorkerMemorySnapshot } from "@/lib/workforce/WorkerMemory";

// Deliberately thin: composing a prompt is already solved by the Prompt
// Layer (B2). This adapts the richer, ranked/merged/budgeted
// KnowledgeContext into the plain SearchResult[] buildCompiledPrompt
// already accepts, instead of reimplementing section/message assembly.
export function composePrompt(
  worker: WorkerInstance,
  knowledgeContext: KnowledgeContext,
  memory: WorkerMemorySnapshot,
  history: ConversationTurn[],
  userMessage: string,
): CompiledPrompt {
  return buildCompiledPrompt({
    promptTemplate: worker.definition.promptTemplate,
    knowledge: knowledgeContext.included.map((source) => source.result),
    memory,
    history,
    userMessage,
  });
}
