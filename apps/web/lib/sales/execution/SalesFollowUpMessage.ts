import type { PriorityCustomerRow } from "@/lib/sales/PriorityEngine";

// A small deterministic template, zero AI — consistent with Today's
// Priorities' existing rule-based framing (PriorityEngine.ts).
// This is the "recommended message" a Sales user reviews before approving
// execution, not a live-generated draft.
export function buildFollowUpMessage(row: PriorityCustomerRow): string {
  const contactName = row.customer.contactName || row.customer.name;
  return `Hi ${contactName}, checking in on behalf of ${row.customer.name}. ${row.followUpReason} ${row.suggestedAction}`;
}
