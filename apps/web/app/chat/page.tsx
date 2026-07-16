import EmptyState from "@/components/design/EmptyState";
import ExecutiveDecisionCard from "@/components/design/ExecutiveDecisionCard";
import PageHeader from "@/components/design/PageHeader";
import PageSection from "@/components/design/PageSection";
import ExecutiveWorkspacePanel from "@/components/ExecutiveWorkspacePanel";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import { prioritizeDecisions } from "@/lib/executive-intelligence/ExecutiveDecisionEngine";
import { RetrievalService } from "@/lib/knowledge-engine/RetrievalService";

// The Executive Workspace (Capability 12) — not a chat bubble UI.
// Executive Brief (server-rendered, from ExecutiveDecisionEngine) leads;
// the interactive Ask AINEX / Suggested Questions / Executive Response /
// Business Impact / Recommended Actions / Supporting Evidence / Follow-up
// Questions flow lives in ExecutiveWorkspacePanel (client component,
// calls the new /api/executive-intelligence route). Same route (/chat)
// and nav label ("Executive Conversation") as before — no navigation
// change. components/ChatPanel.tsx and app/api/chat/route.ts are
// untouched; they still power the Worker Overview page's chat surface.
export default async function ChatPage() {
  const { company } = CompanyProfileStore.getCurrent();
  const { structured: profile } = await RetrievalService.forExecutive();
  const insights = prioritizeDecisions(profile);
  const top = insights[0];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Executive Conversation"
        description={`Ask AINEX anything about ${company.profile.name} — every answer is grounded in Company Intelligence, never a generic chatbot.`}
      />

      <PageSection title="Executive Brief" description="What AINEX currently understands matters most, computed from Company Intelligence.">
        {top ? (
          <ExecutiveDecisionCard
            eyebrow="Executive Brief"
            decision={top.title}
            whyItMatters={top.detail ?? "Identified as today's top priority from Company Intelligence."}
            meta={`${top.priority} priority · ${top.confidence.label} confidence`}
          />
        ) : (
          <EmptyState
            title="Company Intelligence is still learning"
            description={`Upload real documents about ${company.profile.name} in the Knowledge Hub to build an executive brief.`}
          />
        )}
      </PageSection>

      <PageSection>
        <ExecutiveWorkspacePanel />
      </PageSection>
    </div>
  );
}
