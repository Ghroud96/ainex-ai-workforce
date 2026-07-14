import type { TimelineEntry } from "@/components/ActivityTimeline";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { FRIENDLY_DEPARTMENT_LABEL, type DepartmentWorkerId } from "@/lib/enterprise/EnterpriseUserTypes";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG, type DealStage, type SalesDeal } from "@/lib/sales/SalesDealTypes";

// A structured business event, not a display row — shaped for reuse as a
// future input into Company Intelligence, the Executive Dashboard, AI
// reasoning, and audit, not just today's one "Recent Activity" panel.
// Company-wide by name and shape from day one: `department` is a real
// field on every event, even though Sales is the only real source today.
// A second department becomes one more buildXTimelineEvents() function
// concatenated in buildCompanyTimeline() below — not a plugin registry,
// which would be premature until a second source actually exists.
export interface TimelineEvent {
  id: string;
  department: DepartmentWorkerId;
  actor: string; // an EnterpriseUser id, or "ai" for a recorded AI recommendation
  entity: { type: "deal"; id: string }; // extend this union as new entity types appear
  action: string; // a DealStage value for a stage transition, or "ai-recommendation:<touchpointId>"
  outcome?: string;
  timestamp: string;
}

// DealAiResult carries no timestamp of its own (lib/sales/SalesDealTypes.ts)
// — approximated with the deal's lastInteraction, the closest real signal
// available, rather than inventing a fake precise time.
function buildSalesTimelineEvents(deals: SalesDeal[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const deal of deals) {
    deal.history.forEach((entry, index) => {
      events.push({
        id: `${deal.id}-history-${index}`,
        department: "sales",
        actor: deal.ownerUserId,
        entity: { type: "deal", id: deal.id },
        action: entry.stage,
        outcome: entry.note,
        timestamp: entry.at,
      });
    });

    for (const [touchpointId, result] of Object.entries(deal.aiResults)) {
      if (!result) continue;
      events.push({
        id: `${deal.id}-ai-${touchpointId}`,
        department: "sales",
        actor: "ai",
        entity: { type: "deal", id: deal.id },
        action: `ai-recommendation:${touchpointId}`,
        outcome: result.businessRecommendation,
        timestamp: deal.lastInteraction,
      });
    }
  }

  return events;
}

// The one call every page uses — today it only concatenates Sales, but
// the name and return shape are company-wide so adding Finance/HR/
// Inventory/Procurement/Executive sources later needs no caller change.
export function buildCompanyTimeline(company: GeneratedCompany): TimelineEvent[] {
  const deals = SalesDealStore.listFor(company);
  const events = buildSalesTimelineEvents(deals);
  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// The only place TimelineEvent's structured shape is flattened into
// display copy — everywhere else in the app should keep passing the
// structured event around, not this view.
export function toTimelineEntry(event: TimelineEvent, company: GeneratedCompany): TimelineEntry {
  const deal = event.entity.type === "deal" ? SalesDealStore.get(event.entity.id) : undefined;
  const customerName = deal ? (company.customers.find((c) => c.id === deal.customerId)?.name ?? "a customer") : "a customer";
  const actorName =
    event.actor === "ai" ? "AINEX" : (company.enterpriseUsers.find((u) => u.id === event.actor)?.name ?? "Someone");
  const isAiEvent = event.action.startsWith("ai-recommendation");
  const stageLabel = !isAiEvent && event.action in STAGE_CONFIG ? STAGE_CONFIG[event.action as DealStage].label : event.action;

  return {
    time: event.timestamp,
    title: isAiEvent ? `AI recommendation for ${customerName}` : `${customerName} — ${stageLabel}`,
    subtitle: isAiEvent ? "AINEX" : `${actorName} · ${FRIENDLY_DEPARTMENT_LABEL[event.department]}`,
    description: event.outcome ?? "",
    accent: isAiEvent ? "workflow" : "default",
  };
}
