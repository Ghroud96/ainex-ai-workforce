import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { buildWorkersFromCompany } from "@/lib/enterprise/WorkerContentBuilder";

export type WorkerStatusValue = "Available" | "In Development" | "Coming Soon";

export const WORKER_CAPABILITIES = [
  "Can Answer Questions",
  "Can Generate Reports",
  "Can Trigger Workflows",
  "Can Recommend Actions",
  "Can Monitor KPIs",
] as const;

export type WorkerCapability = (typeof WORKER_CAPABILITIES)[number];

export type WorkerWorkflow = {
  name: string;
  description: string;
};

export type DigitalWorker = {
  slug: string;
  name: string;
  department: string;
  businessFunction: string;
  shortDescription: string;
  businessDescription: string;
  businessValue: string;
  purpose: string;
  successMetric: string;
  status: WorkerStatusValue;
  knowledgeSources: string[];
  workflows: WorkerWorkflow[];
  tools: string[];
  capabilities: WorkerCapability[];
};

// The 10 Digital Workers, flavored for whatever company is currently
// selected (see lib/enterprise/CompanyProfileStore.ts). Called fresh
// every time — not a cached module-load array — so a company profile
// switch is reflected on the next read, not frozen at first import.
export function getAllWorkers(): DigitalWorker[] {
  return buildWorkersFromCompany(CompanyProfileStore.getCurrent().company);
}

export function getWorkerBySlug(slug: string): DigitalWorker | undefined {
  return getAllWorkers().find((worker) => worker.slug === slug);
}
