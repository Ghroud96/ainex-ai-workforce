"use client";

import { useState } from "react";

const SUPPORTED_FILE_TYPES = ["PDF", "DOCX", "DOC", "XLSX", "CSV", "TXT", "PPTX", "Images"];

export default function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setSubmitted(false);
    setFileName(null);
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
                  Add a document to the Knowledge Hub. Processing begins once the Document Parser
                  is available.
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
                Document received. It will appear in the library once the upload pipeline is
                connected in a future sprint.
              </div>
            ) : (
              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted(true);
                }}
              >
                <label className="block cursor-pointer rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400 hover:border-slate-600">
                  <input
                    type="file"
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
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                    placeholder="e.g. Vendor Contract 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Department
                    </label>
                    <input
                      className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                      placeholder="e.g. Finance"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Category
                    </label>
                    <input
                      className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                      placeholder="e.g. Contracts"
                    />
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
