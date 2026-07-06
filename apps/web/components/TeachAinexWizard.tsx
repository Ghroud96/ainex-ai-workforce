"use client";

import Link from "next/link";
import { useState } from "react";
import { teachAinexAboutDocument, type TeachAinexResult } from "@/app/knowledge/teachAinexActions";
import TagBadge from "@/components/TagBadge";

const SUPPORTED_FILE_TYPES = ["PDF", "DOCX", "DOC", "XLSX", "CSV", "TXT", "PPTX", "Images"];

const CONFIDENCE_TONE: Record<string, string> = {
  High: "bg-green-500/10 text-green-400",
  Medium: "bg-amber-500/10 text-amber-400",
  Low: "bg-red-500/10 text-red-400",
};

type WizardStep = "choose" | "uploading" | "analysis" | "confirmed";

// A deliberately separate, differently-framed flow from UploadDialog.tsx
// (which stays untouched as the manual, power-user upload path). This one
// never says "Upload Document" — the point of this feature is that it
// should feel like teaching a new Digital Workforce employee about the
// company, not operating a technical upload tool.
export default function TeachAinexWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [result, setResult] = useState<TeachAinexResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("choose");
    setFile(null);
    setDisplayName("");
    setResult(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function handleUpload() {
    if (!file || displayName.trim().length === 0) return;
    setStep("uploading");
    setError(null);
    try {
      const teachResult = await teachAinexAboutDocument(file, displayName.trim());
      setResult(teachResult);
      setStep("analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong teaching AINEX this document.");
      setStep("choose");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
      >
        Teach AINEX about your company
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-slate-900 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {step === "choose" && "Teach AINEX about your company"}
                  {step === "uploading" && "Handing this to AINEX..."}
                  {step === "analysis" && "Here's what AINEX just learned"}
                  {step === "confirmed" && `${result?.document.name} is now part of your Digital Workforce`}
                </h2>
                {step === "choose" && (
                  <p className="mt-1 text-sm text-slate-400">
                    Upload one real document from your business. AINEX will read it with live AI and learn from it
                    immediately.
                  </p>
                )}
              </div>
              <button type="button" onClick={close} aria-label="Close" className="text-slate-500 hover:text-slate-300">
                ✕
              </button>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>
            )}

            {step === "choose" && (
              <div className="mt-6 space-y-4">
                <label className="block cursor-pointer rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400 hover:border-slate-600">
                  <input
                    type="file"
                    required
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.csv,.txt,.pptx,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <span className="text-slate-200">{file.name}</span>
                  ) : (
                    <span>Drag and drop a file here, or click to browse.</span>
                  )}
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {SUPPORTED_FILE_TYPES.map((type) => (
                      <span key={type} className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                        {type}
                      </span>
                    ))}
                  </div>
                </label>

                <div>
                  <label className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    What should we call this document?
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-800 p-3 text-sm text-white outline-none"
                    placeholder="e.g. Our Sales SOP"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!file || displayName.trim().length === 0}
                    onClick={handleUpload}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next: Upload
                  </button>
                </div>
              </div>
            )}

            {step === "uploading" && (
              <div className="mt-6 rounded-lg bg-slate-800/60 p-6 text-center text-sm text-slate-300">
                AINEX is reading {file?.name}...
              </div>
            )}

            {step === "analysis" && result && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Executive Summary</p>
                  <p className="mt-1 text-sm text-slate-300">{result.intelligence.executiveSummary}</p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Key Findings</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-300">
                    {result.intelligence.keyFindings.map((finding, index) => (
                      <li key={index}>• {finding}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Business Risks</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-300">
                    {result.intelligence.businessRisks.map((risk, index) => (
                      <li key={index}>• {risk}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Business Opportunities</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-300">
                    {result.intelligence.businessOpportunities.map((opportunity, index) => (
                      <li key={index}>• {opportunity}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Recommended Actions</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-300">
                    {result.intelligence.recommendedActions.map((action, index) => (
                      <li key={index}>• {action}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-slate-300">{result.intelligence.executiveConclusion}</p>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
                  <TagBadge label={`Department: ${result.intelligence.suggestedDepartment}`} />
                  <TagBadge label={`Category: ${result.intelligence.suggestedCategory}`} />
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      CONFIDENCE_TONE[result.intelligence.confidence.label] ?? "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Confidence: {result.intelligence.confidence.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{result.intelligence.confidence.basis}</p>

                <div className="flex flex-wrap gap-2">
                  {result.intelligence.knowledgeTags.map((tag) => (
                    <TagBadge key={tag} label={tag} />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                  <TagBadge label={`Model: ${result.intelligence.modelUsed}`} />
                  <TagBadge label={result.intelligence.source} />
                  <TagBadge
                    label={`Generation Time: ${result.intelligence.generationTimeMs === 0 ? "Instant" : `${result.intelligence.generationTimeMs}ms`}`}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("confirmed")}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
                  >
                    Next: Add to Digital Workforce
                  </button>
                </div>
              </div>
            )}

            {step === "confirmed" && result && (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-slate-300">AINEX has taught this to:</p>
                <div className="space-y-2">
                  {result.workersNowTrained.map((worker) => (
                    <Link
                      key={worker.slug}
                      href={`/workforce/${worker.slug}`}
                      onClick={close}
                      className="block rounded-lg border border-slate-800 bg-slate-800/60 p-3 text-sm text-blue-400 hover:text-blue-300"
                    >
                      See it in {worker.name}&apos;s Available Knowledge →
                    </Link>
                  ))}
                </div>

                <div className="rounded-lg bg-slate-800/60 p-4 text-sm text-slate-400">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Current Session</p>
                  <p className="mt-1">
                    {result.sessionSnapshot.uploadCount} uploaded file
                    {result.sessionSnapshot.uploadCount === 1 ? "" : "s"} · Live AI Runs{" "}
                    {result.sessionSnapshot.liveAiCallCount} · Estimated AI Cost RM
                    {result.sessionSnapshot.estimatedCostRm.toFixed(2)}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white">
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700"
                  >
                    Teach AINEX Another Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
