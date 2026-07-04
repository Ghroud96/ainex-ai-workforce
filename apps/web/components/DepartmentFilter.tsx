"use client";

import { departments } from "@/data/departments";

export default function DepartmentFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (department: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {departments.map((department) => {
        const active = department === value;

        return (
          <button
            key={department}
            type="button"
            onClick={() => onChange(department)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {department}
          </button>
        );
      })}
    </div>
  );
}
