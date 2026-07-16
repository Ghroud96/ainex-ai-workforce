import { NextResponse } from "next/server";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { ConversationService } from "@/lib/executive-intelligence/ConversationService";

// New route (Capability 12) — deliberately separate from app/api/chat/route.ts,
// which stays untouched (components/ChatPanel.tsx still uses it on the
// Worker Overview page). Returns the full structured ExecutiveResponse,
// not flattened to a single string.
export async function POST(req: Request) {
  try {
    const { sessionId, question } = await req.json();

    if (typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }

    const companyId = CompanyProfileStore.getCurrent().company.profile.id;
    const result = await ConversationService.ask(typeof sessionId === "string" ? sessionId : undefined, companyId, question.trim());

    return NextResponse.json(result);
  } catch (error) {
    console.error("EXECUTIVE INTELLIGENCE API ERROR:", error);
    return NextResponse.json(
      { error: "The Executive Intelligence Engine could not process this question. Please try again." },
      { status: 200 },
    );
  }
}
