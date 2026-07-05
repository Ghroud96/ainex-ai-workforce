// "Live Company Simulation" — a deterministic pool of simulated business
// events, each paired with a worker reaction, revealed one at a time on
// the client to feel like a live feed. The CONTENT here is fully
// pre-computed and seeded (same discipline as every other builder in this
// folder); only the reveal TIMING is client-side wall-clock animation
// (see components/LiveActivityTicker.tsx) — no polling, no websocket, no
// new randomness generated per request.
import {
  findCustomerName,
  findProductName,
  findWarehouseName,
  formatCurrency,
} from "@/lib/enterprise/CompanyGenerator";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { WORKER_NAMES_BY_ID } from "@/lib/enterprise/BusinessInsights";
import { tracksInventory } from "@/lib/enterprise/NarrativeBuilder";
import { createRng, type Rng } from "@/lib/enterprise/seededRandom";

export type SimulatedEventKind =
  | "new-order"
  | "supplier-delay"
  | "overdue-invoice"
  | "inventory-shortage"
  | "complaint"
  | "production-issue"
  | "campaign-success"
  | "new-opportunity";

export interface SimulatedEvent {
  id: string;
  kind: SimulatedEventKind;
  headline: string;
  workerReaction: string;
  workerId: string;
  workerName: string;
  revealAfterMs: number;
}

const KIND_ORDER: SimulatedEventKind[] = [
  "new-order",
  "supplier-delay",
  "overdue-invoice",
  "inventory-shortage",
  "complaint",
  "production-issue",
  "campaign-success",
  "new-opportunity",
];

function buildOne(kind: SimulatedEventKind, company: GeneratedCompany, rng: Rng): { headline: string; workerReaction: string; workerId: string } {
  const goodsBased = tracksInventory(company);

  switch (kind) {
    case "new-order": {
      const customer = rng.pick(company.customers);
      const product = rng.pick(company.products);
      return {
        headline: `New order from ${customer.name} for ${product.name}.`,
        workerReaction: "Logged the order and confirmed the delivery timeline.",
        workerId: "sales",
      };
    }
    case "supplier-delay": {
      const supplier = rng.pick(company.suppliers);
      return {
        headline: `${supplier.name} reported a shipment delay.`,
        workerReaction: "Contacting the supplier for a revised delivery date.",
        workerId: "procurement",
      };
    }
    case "overdue-invoice": {
      const invoice = rng.pick(company.invoices);
      return {
        headline: `Invoice for ${findCustomerName(company, invoice.customerId)} (${formatCurrency(invoice.amount, company.profile.currency)}) just passed its due date.`,
        workerReaction: "Queued a payment reminder.",
        workerId: "finance",
      };
    }
    case "inventory-shortage": {
      const item = rng.pick(company.inventory);
      const productName = findProductName(company, item.productId);
      return {
        headline: goodsBased
          ? `${productName} dropped below its reorder point at ${findWarehouseName(company, item.warehouseId)}.`
          : `${productName} is nearing capacity at ${findWarehouseName(company, item.warehouseId)}.`,
        workerReaction: goodsBased ? "Prepared a reorder request." : "Requested a capacity review.",
        workerId: "inventory",
      };
    }
    case "complaint": {
      const customer = rng.pick(company.customers);
      return {
        headline: `${customer.name} submitted a new complaint via support.`,
        workerReaction: "Opened a ticket and assigned priority.",
        workerId: "customer-support",
      };
    }
    case "production-issue": {
      const warehouse = rng.pick(company.warehouses);
      return {
        headline: `Production delay reported at ${warehouse.name}.`,
        workerReaction: "Investigating root cause with the site lead.",
        workerId: "operations",
      };
    }
    case "campaign-success": {
      const campaign = rng.pick(company.campaigns);
      return {
        headline: `"${campaign.name}" campaign conversion jumped to ${campaign.conversionRate}%.`,
        workerReaction: "Flagged for additional budget allocation.",
        workerId: "marketing",
      };
    }
    case "new-opportunity": {
      const customer = rng.pick(company.customers);
      return {
        headline: `New sales opportunity identified with ${customer.name}.`,
        workerReaction: "Added to the pipeline for follow-up.",
        workerId: "sales",
      };
    }
  }
}

// Skips a kind whose backing entity list is empty (e.g. a company with no
// active campaigns) rather than throwing — keeps this safe across every
// industry/size combination the generator can produce.
function hasEntitiesFor(kind: SimulatedEventKind, company: GeneratedCompany): boolean {
  switch (kind) {
    case "new-order":
    case "complaint":
    case "new-opportunity":
      return company.customers.length > 0 && (kind !== "new-order" || company.products.length > 0);
    case "supplier-delay":
      return company.suppliers.length > 0;
    case "overdue-invoice":
      return company.invoices.length > 0;
    case "inventory-shortage":
      return company.inventory.length > 0;
    case "production-issue":
      return company.warehouses.length > 0;
    case "campaign-success":
      return company.campaigns.length > 0;
  }
}

export function buildSimulatedEventFeed(company: GeneratedCompany, count = 10): SimulatedEvent[] {
  const rng = createRng(`${company.profile.id}::live-sim`);
  const availableKinds = KIND_ORDER.filter((kind) => hasEntitiesFor(kind, company));
  if (availableKinds.length === 0) return [];

  const events: SimulatedEvent[] = [];
  let elapsedMs = 0;

  for (let i = 0; i < count; i += 1) {
    const kind = availableKinds[i % availableKinds.length];
    const built = buildOne(kind, company, rng);
    events.push({
      id: `sim-${i}`,
      kind,
      headline: built.headline,
      workerReaction: built.workerReaction,
      workerId: built.workerId,
      workerName: WORKER_NAMES_BY_ID[built.workerId] ?? built.workerId,
      revealAfterMs: elapsedMs,
    });
    elapsedMs += rng.range(3000, 6000);
  }

  return events;
}
