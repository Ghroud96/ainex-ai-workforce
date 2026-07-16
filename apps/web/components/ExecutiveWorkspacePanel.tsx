"use client";

import { useState } from "react";
import ActionButton from "@/components/design/ActionButton";
import AIRecommendationCard from "@/components/design/AIRecommendationCard";
import EmptyState from "@/components/design/EmptyState";
import EntityCard from "@/components/design/EntityCard";
import LoadingState from "@/components/design/LoadingState";
import SectionHeader from "@/components/design/SectionHeader";
import StatusBadge from "@/components/design/StatusBadge";
import TimelineCard from "@/components/design/TimelineCard";
import Expandable from "@/components/Expandable";
import { border, text } from "@/lib/design/colors";
import type { ExecutiveResponse } from "@/lib/executive-intelligence/ExecutiveResponseTypes";

const SUGGESTED_QUESTIONS = [
  "What's our executive summary today?",
  "What are our biggest business risks?",
  "What growth opportunities should we prioritize?",
  "Which department needs attention?",
  "What changed recently?",
];

const CONFIDENCE_TONE: Record<string, "success" | "warning" | "danger"> = {
  High: "success",
  Medium: "warning",
  Low: "danger",
};

interface AskApiResponse {
  sessionId: string;
  response?: ExecutiveResponse;
  error?: string;
}

export default function ExecutiveWorkspacePanel() {
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ExecutiveResponse | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setQuestion("");

    try {
      const res = await fetch("/api/executive-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, question: trimmed }),
      });
      const data: AskApiResponse = await res.json();

      if (data.error || !data.response) {
        setError(data.error ?? "No response was generated.");
      } else {
        setSessionId(data.sessionId);
        setResponse(data.response);
        setAskedQuestion(trimmed);
      }
    } catch {
      setError("The Executive Intelligence Engine could not be reached. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader title="Ask AINEX" description="Ask a direct business question — grounded entirely in Company Intelligence, never a generic answer." />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. What are our biggest risks right now?"
          disabled={loading}
          className={`min-w-[280px] flex-1 rounded-lg border ${border.hairline} bg-white p-3 text-sm ${text.primary} outline-none focus:border-blue-600 disabled:opacity-50`}
        />
        <ActionButton type="submit" variant="primary" disabled={loading || question.trim().length === 0}>
          Ask
        </ActionButton>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((suggestion) => (
          <ActionButton key={suggestion} type="button" variant="secondary" disabled={loading} onClick={() => void ask(suggestion)}>
            {suggestion}
          </ActionButton>
        ))}
      </div>

      <div className="mt-10">
        {loading && <LoadingState label="AINEX is reviewing Company Intelligence…" />}

        {!loading && error && (
          <EmptyState title="Something went wrong" description={error} />
        )}

        {!loading && !error && !response && (
          <EmptyState
            title="No question asked yet"
            description="Ask a question above, or pick a suggested one — every answer is grounded in real Company Intelligence, not invented."
          />
        )}

        {!loading && !error && response && (
          <div className="space-y-8">
            <div>
              <p className={`text-xs font-medium tracking-wide ${text.muted} uppercase`}>You asked</p>
              <p className={`mt-1 text-sm ${text.secondary}`}>{askedQuestion}</p>
            </div>

            {(response.summary || response.reasoning) && (
              <AIRecommendationCard
                recommendation={response.summary ?? "No summary available."}
                reason={response.reasoning}
                source={response.confidence ? `${response.confidence.label} confidence — ${response.confidence.basis}` : "Rule-based — Company Intelligence"}
              />
            )}

            {response.confidence && (
              <StatusBadge label={`Confidence: ${response.confidence.label}`} tone={CONFIDENCE_TONE[response.confidence.label] ?? "info"} />
            )}

            {response.businessImpact && (
              <EntityCard title="Business Impact">
                <p className={`text-sm ${text.secondary}`}>{response.businessImpact}</p>
              </EntityCard>
            )}

            {response.recommendation && (
              <EntityCard title="Recommendation">
                <p className={`text-sm ${text.secondary}`}>{response.recommendation}</p>
              </EntityCard>
            )}

            {response.suggestedActions && response.suggestedActions.length > 0 && (
              <div>
                <p className={`mb-3 text-xs font-medium tracking-wide ${text.muted} uppercase`}>Recommended Actions</p>
                <div className="flex flex-wrap gap-3">
                  {response.suggestedActions.map((action) => (
                    <a key={action.id} href={action.href} className="no-underline">
                      <ActionButton type="button" variant="secondary" title={action.reason}>
                        {action.label}
                      </ActionButton>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {response.unknownInformation && response.unknownInformation.length > 0 && (
              <EntityCard title="What AINEX doesn't know yet" status={<StatusBadge label="Coverage gap" tone="warning" />}>
                <p className={`text-sm ${text.secondary}`}>
                  Not enough verified information about: {response.unknownInformation.join(", ")}.
                </p>
              </EntityCard>
            )}

            {response.evidence && response.evidence.length > 0 && (
              <Expandable summary={`View ${response.evidence.length} supporting evidence entries`}>
                <div>
                  {response.evidence.map((entry, index) => (
                    <TimelineCard
                      key={`${entry.documentId}-${index}`}
                      title={entry.label}
                      subtitle={entry.department}
                      time=""
                      description={entry.snippet ?? "Cited as supporting evidence."}
                      isLast={index === response.evidence!.length - 1}
                    />
                  ))}
                </div>
              </Expandable>
            )}

            {response.followUpQuestions && response.followUpQuestions.length > 0 && (
              <div>
                <p className={`mb-3 text-xs font-medium tracking-wide ${text.muted} uppercase`}>Follow-up Questions</p>
                <div className="flex flex-wrap gap-2">
                  {response.followUpQuestions.map((followUp) => (
                    <ActionButton key={followUp} type="button" variant="secondary" disabled={loading} onClick={() => void ask(followUp)}>
                      {followUp}
                    </ActionButton>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
