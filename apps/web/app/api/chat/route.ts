import { NextResponse } from "next/server";
import { ProductionRagService, type ProductionRagResponse } from "@/lib/rag/ProductionRagService";

// ChatPanel (Sprint 2, unmodified) renders a single reply string, so the
// structured ProductionRagResponse is flattened here into one
// deterministic, code-enforced line — not left to the model's discretion
// — the same guarantee Phase C3's BasicRagAdapter made for its simpler
// keyword-only pipeline. sources and safetyMessage are never both empty:
// ProductionRagService always sets a safetyMessage when there are zero
// sources.
function buildReply(result: ProductionRagResponse): string {
  if (result.finishReason === "error") return result.answer;

  const lines: string[] = [];
  if (result.sources.length > 0) {
    lines.push(`Sources: ${result.sources.map((source) => `${source.label} ${source.title}`).join(", ")}`);
  }
  if (result.safetyMessage) {
    lines.push(result.safetyMessage);
  }

  return `${result.answer}\n\n— ${lines.join(" ")}`;
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ reply: "Please enter a message." });
    }

    const result = await ProductionRagService.answer(message);
    return NextResponse.json({ reply: buildReply(result) });
  } catch (error) {
    console.error("CHAT API ERROR:", error);

    return NextResponse.json(
      { reply: "AI request failed. Please check server logs." },
      { status: 200 },
    );
  }
}
