import type { Category } from "@/data/categories";
import type { Department } from "@/data/departments";
import { createRng } from "@/lib/enterprise/seededRandom";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { INDUSTRY_TEMPLATES } from "@/lib/enterprise/IndustryTemplates";

export type DocumentStatusValue = "Indexed" | "Pending" | "Processing" | "Archived";
export type ProcessingStage = "Uploaded" | "Parsing" | "Chunking" | "Embedding" | "Indexed" | "Available" | "Archived";
export type FileType = "PDF" | "DOCX" | "DOC" | "XLSX" | "CSV" | "TXT" | "PPTX" | "Image";

export interface BuiltDigitalDocument {
  id: string;
  name: string;
  description: string;
  department: Department;
  owner: string;
  category: Category;
  version: string;
  uploadDate: string;
  status: DocumentStatusValue;
  processingStage: ProcessingStage;
  fileType: FileType;
  sizeKb: number;
  tags: string[];
  usedBy: string[];
  workflows: string[];
  relatedDocuments: string[];
  source: "demo" | "customer-upload";
}

interface DocRole {
  id: string;
  department: Department;
  category: Category;
  fileType: FileType;
  sizeKb: number;
  status: DocumentStatusValue;
  processingStage: ProcessingStage;
  tagsBase: string[];
  usedBy: string[];
  workflows: string[];
  relatedTo: string[];
}

// Fixed structure — id/department/category/usedBy/workflows never change
// across industry or size, only the title/description/owner/dates (from
// IndustryTemplates.documentTitles / documentDescriptions, index-matched
// below). This keeps document ids stable across every company (safe for
// generateStaticParams — see docs/architecture/enterprise-demo.md) and
// keeps RAG retrieval's department-scoping and the worker pages' usedBy
// filtering working exactly as they did before this phase, since those
// depend on these department/usedBy values, not on document content.
const DOC_ROLES: DocRole[] = [
  { id: "employee-handbook", department: "HR", category: "Policies", fileType: "PDF", sizeKb: 4200, status: "Indexed", processingStage: "Indexed", tagsBase: ["policy", "onboarding", "conduct"], usedBy: ["HR Worker", "Executive Worker"], workflows: ["Onboarding Checklist Reminder"], relatedTo: ["onboarding-sop", "leave-policy"] },
  { id: "onboarding-sop", department: "HR", category: "SOP", fileType: "DOCX", sizeKb: 860, status: "Indexed", processingStage: "Available", tagsBase: ["onboarding", "checklist"], usedBy: ["HR Worker"], workflows: ["Onboarding Checklist Reminder"], relatedTo: ["employee-handbook"] },
  { id: "leave-policy", department: "HR", category: "HR", fileType: "PDF", sizeKb: 390, status: "Indexed", processingStage: "Indexed", tagsBase: ["hr", "leave", "attendance"], usedBy: ["HR Worker"], workflows: [], relatedTo: ["employee-handbook"] },
  { id: "q1-financial-report", department: "Finance", category: "Finance", fileType: "XLSX", sizeKb: 1800, status: "Indexed", processingStage: "Indexed", tagsBase: ["financial-report", "quarterly"], usedBy: ["Finance Worker", "Executive Worker"], workflows: ["Invoice Reminder"], relatedTo: ["invoice-register", "admin-travel-policy"] },
  { id: "invoice-register", department: "Finance", category: "Finance", fileType: "CSV", sizeKb: 410, status: "Processing", processingStage: "Chunking", tagsBase: ["invoices", "cash-flow"], usedBy: ["Finance Worker"], workflows: ["Invoice Reminder"], relatedTo: ["q1-financial-report"] },
  { id: "sales-playbook", department: "Sales", category: "Sales", fileType: "PPTX", sizeKb: 6100, status: "Indexed", processingStage: "Indexed", tagsBase: ["sales", "playbook", "pricing"], usedBy: ["Sales Worker", "Marketing Worker"], workflows: ["Lead Follow-up"], relatedTo: ["pipeline-report"] },
  { id: "pipeline-report", department: "Sales", category: "Sales", fileType: "XLSX", sizeKb: 980, status: "Pending", processingStage: "Uploaded", tagsBase: ["pipeline", "sales"], usedBy: ["Sales Worker"], workflows: ["Lead Follow-up"], relatedTo: ["sales-playbook"] },
  { id: "warehouse-sop", department: "Operations", category: "Operations", fileType: "PDF", sizeKb: 2900, status: "Indexed", processingStage: "Available", tagsBase: ["warehouse", "sop", "inventory"], usedBy: ["Operations Worker", "Inventory Worker"], workflows: ["Production Delay Alert", "Stock Alert"], relatedTo: ["inventory-master"] },
  { id: "inventory-master", department: "Warehouse", category: "Inventory", fileType: "CSV", sizeKb: 1200, status: "Processing", processingStage: "Embedding", tagsBase: ["inventory", "stock", "sku"], usedBy: ["Inventory Worker", "Procurement Worker"], workflows: ["Stock Alert"], relatedTo: ["warehouse-sop"] },
  { id: "vendor-msa", department: "Executive", category: "Contracts", fileType: "PDF", sizeKb: 1500, status: "Indexed", processingStage: "Indexed", tagsBase: ["contract", "vendor", "legal"], usedBy: ["Procurement Worker", "Compliance Worker"], workflows: ["Contract Renewal Reminder"], relatedTo: ["compliance-checklist"] },
  { id: "compliance-checklist", department: "Executive", category: "Legal", fileType: "DOCX", sizeKb: 540, status: "Indexed", processingStage: "Available", tagsBase: ["compliance", "legal", "audit"], usedBy: ["Compliance Worker"], workflows: ["Policy Gap Alert"], relatedTo: ["vendor-msa"] },
  { id: "admin-travel-policy", department: "Executive", category: "Administration", fileType: "PDF", sizeKb: 480, status: "Indexed", processingStage: "Available", tagsBase: ["admin", "travel", "expense"], usedBy: ["Executive Worker", "Finance Worker"], workflows: [], relatedTo: ["q1-financial-report"] },
  { id: "support-macros", department: "Customer Support", category: "Customer Service", fileType: "DOCX", sizeKb: 720, status: "Indexed", processingStage: "Indexed", tagsBase: ["support", "templates", "escalation"], usedBy: ["Customer Support Worker"], workflows: ["Customer Escalation"], relatedTo: ["product-faq"] },
  { id: "product-faq", department: "Customer Support", category: "Training", fileType: "TXT", sizeKb: 310, status: "Pending", processingStage: "Parsing", tagsBase: ["faq", "training", "product"], usedBy: ["Customer Support Worker", "Sales Worker"], workflows: [], relatedTo: ["support-macros"] },
  { id: "brand-guidelines", department: "Marketing", category: "Marketing", fileType: "PDF", sizeKb: 8400, status: "Archived", processingStage: "Archived", tagsBase: ["brand", "marketing", "guidelines"], usedBy: ["Marketing Worker"], workflows: ["Campaign Performance Digest"], relatedTo: ["sales-playbook"] },
  { id: "network-architecture", department: "IT", category: "Engineering", fileType: "Image", sizeKb: 3300, status: "Indexed", processingStage: "Indexed", tagsBase: ["it", "architecture", "security"], usedBy: ["Executive Worker"], workflows: [], relatedTo: [] },
  { id: "board-report", department: "Executive", category: "Finance", fileType: "PDF", sizeKb: 2100, status: "Indexed", processingStage: "Indexed", tagsBase: ["board", "quarterly", "performance"], usedBy: ["Executive Worker"], workflows: [], relatedTo: ["q1-financial-report"] },
  { id: "meeting-minutes", department: "Executive", category: "Administration", fileType: "DOCX", sizeKb: 240, status: "Indexed", processingStage: "Available", tagsBase: ["minutes", "leadership", "governance"], usedBy: ["Executive Worker"], workflows: [], relatedTo: ["board-report"] },
  { id: "training-manual", department: "HR", category: "Training", fileType: "PDF", sizeKb: 1650, status: "Indexed", processingStage: "Indexed", tagsBase: ["training", "onboarding", "manual"], usedBy: ["HR Worker"], workflows: [], relatedTo: ["onboarding-sop"] },
  { id: "product-catalogue", department: "Sales", category: "Sales", fileType: "PPTX", sizeKb: 3900, status: "Indexed", processingStage: "Indexed", tagsBase: ["catalogue", "product", "pricing"], usedBy: ["Sales Worker", "Marketing Worker"], workflows: [], relatedTo: ["sales-playbook"] },
];

function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function buildDocumentsFromCompany(company: GeneratedCompany, documentCount: number): BuiltDigitalDocument[] {
  const template = INDUSTRY_TEMPLATES[company.profile.industry];
  const rng = createRng(`${company.profile.id}::documents`);
  const roles = DOC_ROLES.slice(0, Math.min(documentCount, DOC_ROLES.length));

  return roles.map((role, index) => {
    const owner = company.employees.length > 0 ? rng.pick(company.employees).name : "Unassigned";
    const tags = [...role.tagsBase, company.profile.industry.toLowerCase().replace(/\s+/g, "-")];

    return {
      id: role.id,
      name: template.documentTitles[index] ?? role.id,
      description: template.documentDescriptions[index] ?? "",
      department: role.department,
      owner,
      category: role.category,
      version: `v${rng.range(1, 5)}.${rng.range(0, 9)}`,
      uploadDate: daysAgoISO(rng.range(5, 200)),
      status: role.status,
      processingStage: role.processingStage,
      fileType: role.fileType,
      sizeKb: role.sizeKb,
      tags,
      usedBy: role.usedBy,
      workflows: role.workflows,
      relatedDocuments: role.relatedTo.filter((id) => roles.some((r) => r.id === id)),
      source: "demo",
    };
  });
}
