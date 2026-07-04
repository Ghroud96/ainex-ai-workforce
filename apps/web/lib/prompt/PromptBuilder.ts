import type { SearchResult } from "@/lib/knowledge/types";
import type { ProviderMessage } from "@/lib/llm/ProviderRequest";
import type { CompiledPrompt, PromptSection } from "@/lib/prompt/PromptTypes";
import type { ConversationTurn, WorkerMemorySnapshot } from "@/lib/workforce/WorkerMemory";
import type { PromptTemplate } from "@/lib/workforce/WorkerTypes";

export interface PromptBuildInput {
  promptTemplate: PromptTemplate;
  knowledge: SearchResult[];
  memory: WorkerMemorySnapshot;
  history: ConversationTurn[];
  userMessage: string;
}

function buildSystemSection(promptTemplate: PromptTemplate): PromptSection {
  return {
    id: "system",
    title: "System",
    content: [promptTemplate.systemPrompt, ...promptTemplate.instructions].join("\n"),
  };
}

function buildKnowledgeSection(knowledge: SearchResult[]): PromptSection {
  const content =
    knowledge.length === 0
      ? "No knowledge context is available for this question yet."
      : knowledge
          .map((result, index) => `[${index + 1}] (${result.metadata.title}) ${result.content}`)
          .join("\n");

  return { id: "knowledge", title: "Knowledge Context", content };
}

function buildMemorySection(memory: WorkerMemorySnapshot): PromptSection {
  const facts: string[] = [];
  if (memory.company?.facts.length) facts.push(...memory.company.facts);
  if (memory.longTerm?.summary) facts.push(memory.longTerm.summary);

  const content = facts.length === 0 ? "No memory is available for this worker yet." : facts.join("\n");
  return { id: "memory", title: "Memory", content };
}

function buildHistorySection(history: ConversationTurn[]): PromptSection {
  const content =
    history.length === 0
      ? "No prior conversation this session."
      : history.map((turn) => `${turn.role === "user" ? "User" : "Worker"}: ${turn.content}`).join("\n");

  return { id: "history", title: "Conversation History", content };
}

function buildUserSection(userMessage: string): PromptSection {
  return { id: "user", title: "Current Message", content: userMessage };
}

function toProviderMessages(
  promptTemplate: PromptTemplate,
  knowledgeSection: PromptSection,
  memorySection: PromptSection,
  history: ConversationTurn[],
  userMessage: string,
): ProviderMessage[] {
  const systemContent = [
    promptTemplate.systemPrompt,
    ...promptTemplate.instructions,
    `Knowledge Context:\n${knowledgeSection.content}`,
    `Memory:\n${memorySection.content}`,
  ].join("\n\n");

  const messages: ProviderMessage[] = [{ role: "system", content: systemContent }];

  for (const turn of history) {
    messages.push({ role: turn.role === "user" ? "user" : "assistant", content: turn.content });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

// Pure compilation: no I/O, no provider call. Retrieval and memory are
// passed in already resolved — PromptEngine is what fetches them.
export function buildCompiledPrompt(input: PromptBuildInput): CompiledPrompt {
  const systemSection = buildSystemSection(input.promptTemplate);
  const knowledgeSection = buildKnowledgeSection(input.knowledge);
  const memorySection = buildMemorySection(input.memory);
  const historySection = buildHistorySection(input.history);
  const userSection = buildUserSection(input.userMessage);

  return {
    workerId: input.promptTemplate.workerId,
    sections: [systemSection, knowledgeSection, memorySection, historySection, userSection],
    messages: toProviderMessages(
      input.promptTemplate,
      knowledgeSection,
      memorySection,
      input.history,
      input.userMessage,
    ),
  };
}
