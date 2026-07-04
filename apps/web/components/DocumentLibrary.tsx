"use client";

import { useMemo, useState } from "react";
import DepartmentFilter from "@/components/DepartmentFilter";
import DocumentCard from "@/components/DocumentCard";
import DocumentTable from "@/components/DocumentTable";
import KnowledgeCard from "@/components/KnowledgeCard";
import SearchBar from "@/components/SearchBar";
import UploadDialog from "@/components/UploadDialog";
import { categories } from "@/data/categories";
import { departments } from "@/data/departments";
import type { DigitalDocument } from "@/data/documents";

type ViewMode = "grid" | "table";

export default function DocumentLibrary({ documents }: { documents: DigitalDocument[] }) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>(departments[0]);
  const [category, setCategory] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("grid");

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesDepartment = department === "All Departments" || document.department === department;
      const matchesCategory = !category || document.category === category;
      const matchesSearch =
        query.length === 0 ||
        [
          document.name,
          document.department,
          document.category,
          document.owner,
          document.status,
          document.version,
          ...document.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesDepartment && matchesCategory && matchesSearch;
    });
  }, [documents, search, department, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, department, category, owner, tag, status, or version..."
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Table
            </button>
          </div>

          <UploadDialog />
        </div>
      </div>

      <DepartmentFilter value={department} onChange={setDepartment} />

      <div className="flex flex-wrap gap-2">
        <KnowledgeCard name="All Categories" active={category === null} onClick={() => setCategory(null)} />
        {categories.map((item) => (
          <KnowledgeCard
            key={item}
            name={item}
            active={category === item}
            onClick={() => setCategory(item)}
          />
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Showing {filteredDocuments.length} of {documents.length} documents
      </p>

      {filteredDocuments.length === 0 ? (
        <div className="rounded-xl bg-slate-900 p-8 text-center text-sm text-slate-400">
          No documents match your filters.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <DocumentTable documents={filteredDocuments} />
      )}
    </div>
  );
}
