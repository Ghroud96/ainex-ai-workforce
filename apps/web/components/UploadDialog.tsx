"use client";

import { useRef, useState } from "react";
import { uploadDocument } from "@/app/knowledge/actions";
import { categories } from "@/data/categories";
import { departments } from "@/data/departments";

const SUPPORTED_FILE_TYPES = ["PDF", "DOCX", "DOC", "XLSX", "CSV", "TXT", "PPTX", "Images"];
const UPLOADABLE_DEPARTMENTS = departments.filter((department) => department !== "All Departments");

export default function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function close() {
    setOpen(false);
    setSubmitted(false);
    setFileName(null);
    formRef.current?.reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
      >
        Upload Document
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Upload Document</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add a document to the Knowledge Hub. Real text is indexed for .txt files today;
                  other file types are indexed by metadata only.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {submitted ? (
              <div className="mt-6 rounded-lg bg-slate-800/60 p-4 text-sm text-slate-300">
                Document uploaded and indexed. It now appears in the Knowledge Hub.
              </div>
            ) : (
              <form
                ref={formRef}
                action={async (formData) => {
                  await uploadDocument(formData);
                  setSubmitted(true);
                }}
                className="mt-6 space-y-4"
              >
                <label className="block cursor-pointer rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400 hover:border-slate-600">
                  <input
                    type="file"
                    name="file"
                    required
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.csv,.txt,.pptx,image/*"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                  />
                  {fileName ? (
                    <span className="text-slate-200">{fileName}</span>
                  ) : (
                    <span>Drag and drop a file here, or click to browse.</span>
                  )}
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {SUPPORTED_FILE_TYPES.map((type) => (
                      <span
                        key={type}
                        className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </label>

                <div>
                  <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Document Name
                  </label>
                  <input
                    name="name"
                    required
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                    placeholder="e.g. Vendor Contract 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Department
                    </label>
                    <select
                      name="department"
                      required
                      defaultValue=""
                      className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                    >
                      <option value="" disabled>
                        Select department
                      </option>
                      {UPLOADABLE_DEPARTMENTS.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Category
                    </label>
                    <select
                      name="category"
                      required
                      defaultValue=""
                      className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                  >
                    Upload
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
