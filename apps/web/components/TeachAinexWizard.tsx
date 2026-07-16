"use client";

import Link from "next/link";
import { useState } from "react";
import { teachAinexAboutDocument } from "@/app/knowledge/teachAinexActions";
import Stepper from "@/components/Stepper";
import TagBadge from "@/components/TagBadge";
import type { TeachAinexResult } from "@/lib/knowledge/CompanySourceTypes";

const SUPPORTED_FILE_TYPES = ["PDF", "DOCX", "DOC", "XLSX", "CSV", "TXT", "PPTX", "Images"];

const CONFIDENCE_TONE: Record<string, string> = {
  High: "bg-green-50 text-green-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-red-50 text-red-700",
};

type WizardStep = "choose" | "uploading" | "analysis" | "confirmed";

const WIZARD_STEPS = ["Choose Document", "Upload", "AINEX Learning", "Company Intelligence Updated", "Digital Workforce Ready"] as const;

// "uploading" covers both "Upload" and "AINEX Learning" — they're one
// continuous real network+AI call from the client's perspective, not two
// separate round-trips, so both render as reached/active together rather
// than faking a pause between them.
const STEP_TO_STEPPER_INDEX: Record<WizardStep, number> = {
  choose: 0,
  uploading: 2,
  analysis: 3,
  confirmed: 4,
};

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
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Experience AINEX with Your Company
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200/70 bg-white p-8 shadow-xl shadow-slate-900/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {step === "choose" && "Experience AINEX with Your Company"}
                  {step === "uploading" && "AINEX is learning..."}
                  {step === "analysis" && "Here's what AINEX just learned"}
                  {step === "confirmed" && `${result?.document.name} is now part of your Digital Workforce`}
                </h2>
                {step === "choose" && (
                  <p className="mt-1 text-sm text-slate-500">
                    Share one real piece of your business — a Sales SOP, a pricing policy, an employee handbook — and
                    watch AINEX learn it live.
                  </p>
                )}
              </div>
              <button type="button" onClick={close} aria-label="Close" className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="mt-6">
              <Stepper steps={WIZARD_STEPS} currentIndex={STEP_TO_STEPPER_INDEX[step]} />
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}

            {step === "choose" && (
              <div className="mt-6 space-y-4">
                <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-slate-400">
                  <input
                    type="file"
                    required
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.csv,.txt,.pptx,image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <span className="text-slate-800">{file.name}</span>
                  ) : (
                    <span>Drag and drop a file here, or click to browse.</span>
                  )}
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {SUPPORTED_FILE_TYPES.map((type) => (
                      <span key={type} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {type}
                      </span>
                    ))}
                  </div>
                </label>

                <div>
                  <label className="text-xs font-medium tracking-wide text-slate-400 uppercase">
                    What should we call this document?
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-600"
                    placeholder="e.g. Our Sales SOP"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!file || displayName.trim().length === 0}
                    onClick={handleUpload}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next: Upload
                  </button>
                </div>
              </div>
            )}

            {step === "uploading" && (
              <div className="mt-6 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600">
                AINEX is reading {file?.name}...
              </div>
            )}

            {step === "analysis" && result && (
              <div className="mt-6 space-y-5">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Executive Summary</p>
                  <p className="mt-1 text-sm text-slate-800">{result.intelligence.executiveSummary}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Key Findings</p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-600">
                      {result.intelligence.keyFindings.map((finding, index) => (
                        <li key={index}>• {finding}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Business Risks</p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-600">
                      {result.intelligence.businessRisks.map((risk, index) => (
                        <li key={index}>• {risk}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Business Opportunities</p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-600">
                      {result.intelligence.businessOpportunities.map((opportunity, index) => (
                        <li key={index}>• {opportunity}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Recommended Actions</p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-600">
                      {result.intelligence.recommendedActions.map((action, index) => (
                        <li key={index}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="border-t border-slate-200/70 pt-4 text-sm text-slate-500">
                  <span className="font-medium text-slate-700">Executive Conclusion: </span>
                  {result.intelligence.executiveConclusion}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <TagBadge label={`Department: ${result.intelligence.suggestedDepartment}`} />
                  <TagBadge label={`Category: ${result.intelligence.suggestedCategory}`} />
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      CONFIDENCE_TONE[result.intelligence.confidence.label] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Confidence: {result.intelligence.confidence.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{result.intelligence.confidence.basis}</p>

                <div className="flex flex-wrap gap-2">
                  {result.intelligence.knowledgeTags.map((tag) => (
                    <TagBadge key={tag} label={tag} />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200/70 pt-4 text-xs text-slate-400">
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
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Next: Add to Digital Workforce
                  </button>
                </div>
              </div>
            )}

            {step === "confirmed" && result && (
              <div className="mt-6 space-y-4">
                <div className="space-y-2 rounded-lg border border-slate-200/70 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <span>✓</span> Company Intelligence Updated
                  </p>
                  <p className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <span>✓</span> Digital Workforce Updated
                  </p>
                  {result.workersNowTrained.map((worker) => (
                    <p key={worker.slug} className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <span>✓</span> {worker.name} Updated
                    </p>
                  ))}
                </div>

                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">Demo Session</p>
                  <p className="mt-1">
                    {result.sessionSnapshot.uploadCount} document
                    {result.sessionSnapshot.uploadCount === 1 ? "" : "s"} learned · {result.sessionSnapshot.workersUpdatedCount}{" "}
                    worker{result.sessionSnapshot.workersUpdatedCount === 1 ? "" : "s"} updated · Live AI Analyses{" "}
                    {result.sessionSnapshot.liveAiCallCount} · Estimated AI Cost RM
                    {result.sessionSnapshot.estimatedCostRm.toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-200/70 pt-4">
                  <Link
                    href="/dashboard"
                    onClick={close}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Continue to Executive Dashboard →
                  </Link>
                  {result.workersNowTrained.some((worker) => worker.slug === "sales") && (
                    <Link
                      href="/workforce/sales/workspace"
                      onClick={close}
                      className="rounded-lg border border-slate-200/70 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Continue to Sales Workspace →
                    </Link>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900">
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg border border-slate-200/70 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
