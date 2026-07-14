import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { SalesFollowUpExecutionService } from "@/lib/sales/execution/SalesFollowUpExecutionService";

// Hashing both sides to a fixed length before comparing means
// timingSafeEqual never throws on a length mismatch (which would otherwise
// leak length information) and stays genuinely constant-time regardless of
// how long the configured secret is.
function secretsMatch(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

interface CallbackBody {
  executionId?: unknown;
  status?: unknown;
  externalReference?: unknown;
  errorMessage?: unknown;
}

// n8n → AINEX callback for a sales.follow_up execution. Unlike
// app/api/chat/route.ts (a UI-facing route that always returns 200), this
// is a machine-to-machine webhook — it returns proper 4xx/5xx per the
// brief's "n8n → AINEX callbacks must also be verified" / "do not accept
// unauthenticated callbacks" requirements.
export async function POST(req: Request) {
  const expectedSecret = process.env.N8N_EXECUTION_SHARED_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: "The follow-up execution layer is not configured to accept callbacks." },
      { status: 503 },
    );
  }

  const providedSecret = req.headers.get("x-ainex-shared-secret");
  if (!providedSecret || !secretsMatch(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: "Invalid or missing shared secret." }, { status: 401 });
  }

  let body: CallbackBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON body." }, { status: 400 });
  }

  const { executionId, status, externalReference, errorMessage } = body;
  if (
    typeof executionId !== "string" ||
    (status !== "succeeded" && status !== "failed") ||
    (externalReference !== undefined && typeof externalReference !== "string") ||
    (errorMessage !== undefined && typeof errorMessage !== "string")
  ) {
    return NextResponse.json(
      { error: 'executionId (string) and status ("succeeded" | "failed") are required.' },
      { status: 400 },
    );
  }

  const record = SalesFollowUpExecutionService.handleCallback({ executionId, status, externalReference, errorMessage });
  if (!record) {
    return NextResponse.json({ error: `No execution found for executionId "${executionId}".` }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
