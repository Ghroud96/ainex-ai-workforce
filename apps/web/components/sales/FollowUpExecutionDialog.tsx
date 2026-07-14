"use client";

import { useActionState, useState } from "react";
import type { FollowUpExecutionState } from "@/app/workforce/executionActions";
import type { SalesFollowUpExecutionRecord } from "@/lib/sales/execution/SalesFollowUpTypes";

const INITIAL_STATE: FollowUpExecutionState = { error: null };

const STATUS_LABEL: Record<SalesFollowUpExecutionRecord["status"], string> = {
  pending: "Sending",
  processing: "Sending",
  succeeded: "Completed",
  failed: "Failed",
};

const STATUS_CLASS: Record<SalesFollowUpExecutionRecord["status"], string> = {
  pending: "bg-slate-800 text-slate-300",
  processing: "bg-blue-500/10 text-blue-300",
  succeeded: "bg-emerald-500/10 text-emerald-300",
  failed: "bg-red-500/10 text-red-400",
};

// The one customer-facing surface for Capability 09 — a Sales user reviews
// and confirms before anything is sent, and never sees webhook/n8n/JSON
// wording, per the brief's "do not expose technical implementation
// details" requirement. Mirrors UploadDialog.tsx's modal shape; the
// confirm form binds to the executeSalesFollowUp Server Action passed down
// from the Server Component that renders this (same convention as
// WorkflowStepPanel passing managerDecision/financeDecision into
// StageDecisionActions), not imported directly here.
export default function FollowUpExecutionDialog({
  customerId,
  customerName,
  message,
  channel,
  reason,
  initialRecord,
  action,
}: {
  customerId: string;
  customerName: string;
  message: string;
  channel: string;
  reason: string;
  initialRecord?: SalesFollowUpExecutionRecord;
  action: (prevState: FollowUpExecutionState, formData: FormData) => Promise<FollowUpExecutionState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const record = state.record ?? initialRecord;
  const isInFlight = record?.status === "pending" || record?.status === "processing";
  const isDone = record?.status === "succeeded";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
        disabled={isInFlight}
      >
        {isInFlight ? "Sending…" : isDone ? "Follow-Up Sent" : "Execute Follow-Up"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-slate-900 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Execute Follow-Up</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Review the details below. This reaches the customer once confirmed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Customer</dt>
                <dd className="mt-1 text-slate-200">{customerName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Recommended Message</dt>
                <dd className="mt-1 rounded-lg bg-slate-800/60 p-3 text-slate-300">{message}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Channel</dt>
                <dd className="mt-1 text-slate-200 capitalize">{channel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">Reason for Follow-Up</dt>
                <dd className="mt-1 text-slate-300">{reason}</dd>
              </div>
            </dl>

            {record && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[record.status]}`}>
                  {STATUS_LABEL[record.status]}
                </span>
                {record.status === "failed" && record.errorMessage && (
                  <p className="text-xs text-red-400">{record.errorMessage}</p>
                )}
              </div>
            )}
            {state.error && <p className="mt-4 text-xs text-amber-400">{state.error}</p>}

            <form action={formAction} className="mt-6 flex justify-end gap-3">
              <input type="hidden" name="customerId" value={customerId} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={pending || isDone}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {!record ? "Confirm & Execute" : record.status === "failed" ? "Retry" : isInFlight ? "Check Status" : "Sent"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
