import { NextResponse } from "next/server";
import { ProviderRegistry } from "@/lib/llm/ProviderRegistry";
import { appendSourceFooter, buildBasicRagContext, buildSystemMessage } from "@/lib/rag/BasicRagAdapter";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ reply: "Please enter a message." });
    }

    const provider = ProviderRegistry.getActive();
    if (!provider) {
      return NextResponse.json({ reply: "No AI provider is currently available." });
    }

    const ragContext = buildBasicRagContext(message);
    const systemMessage = buildSystemMessage(ragContext);

    const response = await provider.chat({
      model: provider.listModels()[0]?.id ?? "unknown",
      messages: [systemMessage, { role: "user", content: message }],
    });

    // Provider-level failures (missing key, quota, timeout, unavailable)
    // already carry a friendly message in `content` — don't append a
    // "Sources" footer to an error.
    const reply =
      response.finishReason === "error" ? response.content : appendSourceFooter(response.content, ragContext);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("CHAT API ERROR:", error);

    return NextResponse.json(
      { reply: "AI request failed. Please check server logs." },
      { status: 200 },
    );
  }
}
