import Link from "next/link";
import ActivityTimeline from "@/components/ActivityTimeline";
import ChatPanel from "@/components/ChatPanel";
import PageHeader from "@/components/PageHeader";
import SectionTitle from "@/components/SectionTitle";
import {
  findProductName,
  getAtRiskCustomers,
  getLowStockInventory,
} from "@/lib/enterprise/CompanyGenerator";
import { CompanyProfileStore } from "@/lib/enterprise/CompanyProfileStore";
import {
  EXECUTIVE_ASK_QUESTIONS,
  buildExecutiveAskAnswer,
  type ExecutiveAskQuestionId,
} from "@/lib/enterprise/ExecutiveAskBuilder";
import { buildCollaborationChain } from "@/lib/enterprise/NarrativeBuilder";

function isExecutiveAskQuestionId(value: string | undefined): value is ExecutiveAskQuestionId {
  return EXECUTIVE_ASK_QUESTIONS.some((question) => question.id === value);
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { company } = CompanyProfileStore.getCurrent();
  const lowStock = getLowStockInventory(company);
  const atRisk = getAtRiskCustomers(company);
  const collaboration = buildCollaborationChain(company);
  const askAnswer = isExecutiveAskQuestionId(q) ? buildExecutiveAskAnswer(company, q) : null;

  const revenueLine = `Revenue is ${company.financials.revenueTrendPct >= 0 ? "up" : "down"} ${Math.abs(company.financials.revenueTrendPct)}% this quarter`;
  const inventoryLine =
    lowStock.length > 0 ? `, inventory risk was detected for ${findProductName(company, lowStock[0].productId)}` : "";
  const customerLine =
    atRisk.length > 0 ? `. ${atRisk[0].name} hasn't placed an order recently — recommendation: contact them today.` : ".";

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Executive Conversation"
        description={`Ask your Digital Workforce anything about ${company.profile.name} — the answer draws on the same cross-department reasoning shown below, not a single generic chatbot.`}
      />

      <section>
        <SectionTitle
          title="Executive Ask"
          description="Preset questions a CEO would actually ask — each answer is composed from this morning's real generated data, not a live model call."
        />
        <div className="flex flex-wrap gap-2">
          {EXECUTIVE_ASK_QUESTIONS.map((question) => (
            <Link
              key={question.id}
              href={`/chat?q=${question.id}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                q === question.id ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {question.label}
            </Link>
          ))}
        </div>

        {askAnswer && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl bg-slate-900 p-6">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{askAnswer.questionLabel}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                {askAnswer.answer.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-slate-500 uppercase">Digital Workers who contributed</p>
              <div className="rounded-xl bg-slate-900 p-6">
                <ActivityTimeline
                  entries={askAnswer.participants.map((participant) => ({
                    time: "Just now",
                    title: participant.workerName,
                    description: participant.contribution,
                  }))}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="mt-10">
        <ChatPanel
          initialMessages={[
            {
              role: "user",
              content: "How is my company doing today?",
            },
            {
              role: "ai",
              content: `${revenueLine}${inventoryLine}${customerLine}`,
            },
          ]}
        />
      </div>

      <section className="mt-10">
        <SectionTitle
          title="Digital Workers Consulted"
          description="An illustration of how AINEX's Digital Workforce collaborates to reach a business answer like the one above — Executive, Sales, Inventory, and Finance each contribute before a recommendation reaches you."
        />
        <div className="rounded-xl bg-slate-900 p-6">
          <ActivityTimeline
            entries={collaboration.map((step) => ({
              time: step.time,
              title: step.workerName,
              subtitle: step.roleTitle,
              description: step.message,
              accent: step.workerId === "workflow" ? "workflow" : "default",
            }))}
          />
        </div>
      </section>
    </div>
  );
}
