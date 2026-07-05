// "Executive Ask" — a CEO clicks a preset question and gets an
// executive-briefing-toned answer with the Digital Workers who
// "participated." This never touches /api/chat or ProductionRagService:
// every answer is composed purely from data NarrativeBuilder.ts and
// BusinessInsights.ts already derive from the generated company, the same
// honesty boundary the Chat page's "Digital Workers Consulted" section
// already established. Deterministic — the same company always produces
// the same answer for the same question.
import {
  formatCurrency,
  getAtRiskCustomers,
  getOpenSupportTickets,
  getOverdueInvoices,
} from "@/lib/enterprise/CompanyGenerator";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { WORKER_NAMES_BY_ID, buildRecommendedActions, enrichBusinessEvent } from "@/lib/enterprise/BusinessInsights";
import { buildExecutiveBrief, buildRiskAndOpportunityEvents } from "@/lib/enterprise/NarrativeBuilder";

export type ExecutiveAskQuestionId =
  | "what-happened-today"
  | "why-is-revenue-down"
  | "biggest-risks"
  | "customers-need-attention"
  | "departments-require-action";

export interface ExecutiveAskParticipant {
  workerId: string;
  workerName: string;
  contribution: string;
}

export interface ExecutiveAskAnswer {
  questionId: ExecutiveAskQuestionId;
  questionLabel: string;
  answer: string[];
  participants: ExecutiveAskParticipant[];
}

export const EXECUTIVE_ASK_QUESTIONS: { id: ExecutiveAskQuestionId; label: string }[] = [
  { id: "what-happened-today", label: "What happened today?" },
  { id: "why-is-revenue-down", label: "Why is revenue down?" },
  { id: "biggest-risks", label: "What are today's biggest risks?" },
  { id: "customers-need-attention", label: "Which customers need attention?" },
  { id: "departments-require-action", label: "Which departments require action?" },
];

const DEPARTMENT_BY_WORKER_ID: Record<string, string> = {
  executive: "Executive Leadership",
  sales: "Sales",
  finance: "Finance",
  inventory: "Supply Chain",
  hr: "Human Resources",
  "customer-support": "Customer Service",
  operations: "Operations",
  marketing: "Marketing",
  procurement: "Procurement",
  compliance: "Legal & Compliance",
};

function answerWhatHappenedToday(company: GeneratedCompany): { answer: string[]; participants: ExecutiveAskParticipant[] } {
  const answer = buildExecutiveBrief(company);
  const overdue = getOverdueInvoices(company);
  const atRisk = getAtRiskCustomers(company);

  const participants: ExecutiveAskParticipant[] = [
    { workerId: "executive", workerName: WORKER_NAMES_BY_ID.executive, contribution: "Compiled the day's signals from every other Digital Worker into this brief." },
  ];
  if (overdue.length > 0) {
    participants.push({ workerId: "finance", workerName: WORKER_NAMES_BY_ID.finance, contribution: `Flagged ${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"}.` });
  }
  if (atRisk.length > 0) {
    participants.push({ workerId: "sales", workerName: WORKER_NAMES_BY_ID.sales, contribution: `Flagged ${atRisk.length} account${atRisk.length === 1 ? "" : "s"} at risk of churn.` });
  }

  return { answer, participants };
}

function answerWhyRevenueDown(company: GeneratedCompany): { answer: string[]; participants: ExecutiveAskParticipant[] } {
  const { financials, profile } = company;
  const isDown = financials.revenueTrendPct < 0;
  const answer: string[] = [];

  if (isDown) {
    answer.push(`Revenue is down ${Math.abs(financials.revenueTrendPct)}% this quarter, to ${formatCurrency(financials.revenue, profile.currency)}.`);
  } else {
    answer.push(`Revenue is actually up ${financials.revenueTrendPct}% this quarter, to ${formatCurrency(financials.revenue, profile.currency)} — not down, but here's what's moving it.`);
  }
  answer.push(`Expenses moved ${financials.expenseTrendPct >= 0 ? "up" : "down"} ${Math.abs(financials.expenseTrendPct)}% against that revenue trend, driven by ${company.salesOrders.length} orders across ${company.customers.length} active accounts this quarter.`);

  const atRisk = getAtRiskCustomers(company);
  if (atRisk.length > 0) {
    answer.push(`${atRisk.length} account${atRisk.length === 1 ? "" : "s"} — starting with ${atRisk[0].name} — ${atRisk.length === 1 ? "has" : "have"} gone quiet and ${atRisk.length === 1 ? "is" : "are"} weighing on the top line.`);
  }

  const participants: ExecutiveAskParticipant[] = [
    { workerId: "finance", workerName: WORKER_NAMES_BY_ID.finance, contribution: "Broke down the revenue and expense trend behind the number." },
    { workerId: "sales", workerName: WORKER_NAMES_BY_ID.sales, contribution: "Identified which accounts are driving the movement." },
  ];

  return { answer, participants };
}

function answerBiggestRisks(company: GeneratedCompany): { answer: string[]; participants: ExecutiveAskParticipant[] } {
  const { risks } = buildRiskAndOpportunityEvents(company);
  const enriched = risks.slice(0, 3).map((risk) => enrichBusinessEvent(risk));

  const answer = enriched.length > 0
    ? enriched.map((risk) => `${risk.title} — ${risk.businessImpact}${risk.recommendedWorkerName ? ` ${risk.recommendedWorkerName} is on it.` : ""}`)
    : ["No significant risks are flagged right now — the business is tracking cleanly."];

  const participantIds = new Set(enriched.map((risk) => risk.recommendedWorkerId).filter((id): id is string => Boolean(id)));
  const participants: ExecutiveAskParticipant[] = [
    { workerId: "executive", workerName: WORKER_NAMES_BY_ID.executive, contribution: "Ranked today's risks by business impact." },
    ...Array.from(participantIds).map((workerId) => ({
      workerId,
      workerName: WORKER_NAMES_BY_ID[workerId] ?? workerId,
      contribution: "Already working the assigned risk.",
    })),
  ];

  return { answer, participants };
}

function answerCustomersNeedAttention(company: GeneratedCompany): { answer: string[]; participants: ExecutiveAskParticipant[] } {
  const atRisk = getAtRiskCustomers(company);
  const openTickets = getOpenSupportTickets(company);

  const answer = atRisk.length > 0
    ? atRisk.slice(0, 5).map((customer) => `${customer.name} (${customer.segment}) — lifetime value ${formatCurrency(customer.lifetimeValue, company.profile.currency)}, no recent order activity.`)
    : ["No accounts are currently flagged at risk."];

  if (openTickets.length > 0) {
    answer.push(`${openTickets.length} support ticket${openTickets.length === 1 ? "" : "s"} remain open and could affect these relationships if left unresolved.`);
  }

  const participants: ExecutiveAskParticipant[] = [
    { workerId: "sales", workerName: WORKER_NAMES_BY_ID.sales, contribution: "Flagged at-risk accounts from order activity." },
  ];
  if (openTickets.length > 0) {
    participants.push({ workerId: "customer-support", workerName: WORKER_NAMES_BY_ID["customer-support"], contribution: "Tracking open tickets tied to these accounts." });
  }

  return { answer, participants };
}

function answerDepartmentsRequireAction(company: GeneratedCompany): { answer: string[]; participants: ExecutiveAskParticipant[] } {
  const actions = buildRecommendedActions(company);
  const departments = Array.from(new Set(actions.map((action) => DEPARTMENT_BY_WORKER_ID[action.responsibleWorkerId] ?? action.responsibleWorkerName)));

  const answer = actions.length > 0
    ? [
        `${departments.length} department${departments.length === 1 ? "" : "s"} need${departments.length === 1 ? "s" : ""} action today: ${departments.join(", ")}.`,
        ...actions.map((action) => `${action.responsibleWorkerName}: ${action.text}`),
      ]
    : ["No department currently requires action — everything is on track."];

  const participants: ExecutiveAskParticipant[] = actions.map((action) => ({
    workerId: action.responsibleWorkerId,
    workerName: action.responsibleWorkerName,
    contribution: action.text,
  }));

  return { answer, participants };
}

export function buildExecutiveAskAnswer(company: GeneratedCompany, questionId: ExecutiveAskQuestionId): ExecutiveAskAnswer {
  const questionLabel = EXECUTIVE_ASK_QUESTIONS.find((question) => question.id === questionId)?.label ?? "";

  const { answer, participants } = (() => {
    switch (questionId) {
      case "what-happened-today":
        return answerWhatHappenedToday(company);
      case "why-is-revenue-down":
        return answerWhyRevenueDown(company);
      case "biggest-risks":
        return answerBiggestRisks(company);
      case "customers-need-attention":
        return answerCustomersNeedAttention(company);
      case "departments-require-action":
        return answerDepartmentsRequireAction(company);
    }
  })();

  return { questionId, questionLabel, answer, participants };
}
