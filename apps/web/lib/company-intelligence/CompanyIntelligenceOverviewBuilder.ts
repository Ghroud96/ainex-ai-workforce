import { departments, type Department } from "@/data/departments";
import { getAllDocuments, type DigitalDocument } from "@/data/documents";
import { CompanyIntelligenceRegistry, type CompanyIntelligenceSource } from "@/lib/company-intelligence/CompanyIntelligenceSource";

export interface CategoryCount {
  category: string;
  count: number;
}

export interface DepartmentCoverage {
  department: Department;
  count: number;
}

export interface CompanyIntelligenceOverview {
  totalDocuments: number;
  categoryCounts: CategoryCount[];
  departmentCoverage: DepartmentCoverage[];
  recentlyUploaded: DigitalDocument[];
  coverageScore: number;
  coverageLabel: "Strong" | "Developing" | "Early";
  missingKnowledgeAreas: Department[];
  knowledgeReadyDepartments: Department[];
  sources: CompanyIntelligenceSource[];
}

const REAL_DEPARTMENTS = departments.filter((department): department is Department => department !== "All Departments");

// Company Intelligence Health — deterministic, zero AI, same computational
// shape as BusinessInsights.computeBusinessHealthScore (a real precedent
// already in this codebase for turning raw counts into a 0-100 score with
// a qualitative label). Every input comes from getAllDocuments() and the
// fixed 9-department list — no new generator fields.
export function buildCompanyIntelligenceOverview(): CompanyIntelligenceOverview {
  const documents = getAllDocuments();

  const categoryCounts = new Map<string, number>();
  for (const document of documents) {
    categoryCounts.set(document.category, (categoryCounts.get(document.category) ?? 0) + 1);
  }

  const departmentCoverage: DepartmentCoverage[] = REAL_DEPARTMENTS.map((department) => ({
    department,
    count: documents.filter((document) => document.department === department).length,
  }));

  const missingKnowledgeAreas = departmentCoverage.filter((entry) => entry.count === 0).map((entry) => entry.department);
  const knowledgeReadyDepartments = departmentCoverage.filter((entry) => entry.count >= 2).map((entry) => entry.department);

  const departmentsWithDocs = departmentCoverage.filter((entry) => entry.count > 0).length;
  const coverageScore = Math.round((departmentsWithDocs / REAL_DEPARTMENTS.length) * 100);
  const coverageLabel: CompanyIntelligenceOverview["coverageLabel"] =
    coverageScore >= 70 ? "Strong" : coverageScore >= 40 ? "Developing" : "Early";

  const recentlyUploaded = [...documents].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate)).slice(0, 5);

  return {
    totalDocuments: documents.length,
    categoryCounts: Array.from(categoryCounts.entries()).map(([category, count]) => ({ category, count })),
    departmentCoverage,
    recentlyUploaded,
    coverageScore,
    coverageLabel,
    missingKnowledgeAreas,
    knowledgeReadyDepartments,
    sources: CompanyIntelligenceRegistry.getAll(),
  };
}
