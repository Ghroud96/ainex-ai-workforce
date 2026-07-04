import type { ConversationTurn, WorkerMemorySnapshot } from "@/lib/workforce/WorkerMemory";

export interface CompanyProfile {
  id: string;
  name: string;
  industry: string;
}

export interface WorkerContext {
  workerId: string;
  companyProfile: CompanyProfile;
  department: string;
  knowledgeSources: string[];
  connectedDocuments: string[];
  availableIntegrations: string[];
  businessKpis: Record<string, string>;
  userRole: string;
  conversationHistory: ConversationTurn[];
  memory?: WorkerMemorySnapshot;
}
