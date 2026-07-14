import { buildRecommendedActions } from "@/lib/enterprise/BusinessInsights";
import { scoreOpportunity } from "@/lib/enterprise/DecisionEngine";
import { EnterpriseDemoStore } from "@/lib/enterprise/EnterpriseDemoStore";
import type { GeneratedCompany } from "@/lib/enterprise/EnterpriseTypes";
import { SalesDealStore } from "@/lib/sales/SalesDealStore";
import { STAGE_CONFIG, type DealStage, type SalesDeal } from "@/lib/sales/SalesDealTypes";
import { TeachAinexSessionStore } from "@/lib/knowledge/TeachAinexSessionStore";
import { WorkerAnalysisResultStore } from "@/lib/services/knowledge/WorkerAnalysisResultStore";
import type { WorkerAnalysisSection } from "@/lib/services/knowledge/WorkerAnalysisService";

// Pure derivation, no state of its own — every screen's progress and copy
// is computed fresh from the featured deal's real stage plus stores that
// already exist (WorkerAnalysisResultStore, TeachAinexSessionStore). See
// docs/product/enterprise-demo-experience.md for why: a checklist that
// reads existing state, rather than a new workflow engine that tracks it.

export interface EnterpriseDemoScreen {
  label: string;
  done: boolean;
}

export interface TodaysDecisionSnapshot {
  currentScreenIndex: number;
  screens: EnterpriseDemoScreen[];
  customerName: string;
  decision: string;
  whyItMatters: string;
  aiRecommendation: string | null;
  nextAction: string;
  nextHref: string;
  remainingMinutes: number;
  complete: boolean;
}

const SCREEN_LABELS = ["Executive Dashboard", "Sales Workspace", "Workflow", "Executive Summary", "Your Company"] as const;
const SCREEN_MINUTES = [1.5, 2.5, 2, 1.5, 2];

const APPROVAL_STAGES: DealStage[] = ["pending-manager-approval", "pending-finance-review"];
const TERMINAL_STAGES: DealStage[] = ["confirmed", "rejected"];

function daysSinceInteraction(dateIso: string): number {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
}

// Deterministic, never random. Current stage is irrelevant to selection —
// the caller (app/demo/actions.ts::startEnterpriseDemo) always resets
// whatever gets picked back to its just-seeded state, so this stays
// idempotent (the same deal every time "Start Enterprise Demo" is
// clicked) instead of drifting to a different deal once the previous
// featured one has been driven to "confirmed" and no longer qualifies.
// What does matter is each deal's *original* seed stage (not every seeded
// deal starts at "follow-up-needed" — see SalesDealGenerator.ts's
// SEED_STAGES): preferring one that did means the full Sales -> Manager
// -> Finance arc is always demoable from its very first step, not
// whatever step a higher-value deal happened to be pre-seeded at.
//
// Scored via DecisionEngine.scoreOpportunity (value, urgency, customer
// health) rather than estimatedValue alone — "the architecture should not
// assume value alone," approximated with real signals already in the
// data model today, not a hardcoded stub.
export function pickFeaturedOpportunity(company: GeneratedCompany, deals: SalesDeal[]): SalesDeal | undefined {
  const startsFromScratch = deals.filter((deal) => SalesDealStore.getInitialStage(deal.id) === "follow-up-needed");
  const pool = startsFromScratch.length > 0 ? startsFromScratch : deals;

  return [...pool].sort((a, b) => {
    const scoreFor = (deal: SalesDeal) => {
      const customer = company.customers.find((entry) => entry.id === deal.customerId);
      return scoreOpportunity({
        value: deal.estimatedValue,
        urgencyDays: daysSinceInteraction(deal.lastInteraction),
        customerStatus: customer?.status ?? "Active",
      });
    };
    return scoreFor(b) - scoreFor(a);
  })[0];
}

function firstSectionItem(sections: WorkerAnalysisSection[], key: string): string | undefined {
  const section = sections.find((entry) => entry.key === key);
  if (!section) return undefined;
  return Array.isArray(section.value) ? section.value[0] : section.value;
}

// `minScreenIndex` lets a specific page force the decision content to be
// at least its own screen, even if the global progress checklist hasn't
// caught up yet — e.g. the moment a presenter opens Sales Workspace, that
// page should show the sales decision, not linger on the dashboard's
// decision just because the deal hasn't been touched yet. The checklist
// itself (`screens`/`currentScreenIndex` in the returned snapshot) always
// reflects real, unclamped progress — only which screen's *content* gets
// generated is affected.
export function getTodaysDecision(company: GeneratedCompany, minScreenIndex = 0): TodaysDecisionSnapshot | null {
  const featuredDealId = EnterpriseDemoStore.getFeaturedDealId();
  if (!featuredDealId) return null;

  const deal = SalesDealStore.get(featuredDealId);
  if (!deal) return null;

  const customerName = company.customers.find((customer) => customer.id === deal.customerId)?.name ?? "this customer";

  const executiveResult = WorkerAnalysisResultStore.get("executive");
  const assistantResult = WorkerAnalysisResultStore.get("executive-assistant");
  const uploadCount = TeachAinexSessionStore.snapshot().uploadCount;

  const dashboardDone = deal.history.length > 1 || Object.keys(deal.aiResults).length > 0;
  const salesWorkspaceDone = APPROVAL_STAGES.includes(deal.stage) || TERMINAL_STAGES.includes(deal.stage);
  const workflowDone = TERMINAL_STAGES.includes(deal.stage);
  const executiveSummaryDone = Boolean(executiveResult || assistantResult);
  const yourCompanyDone = uploadCount > 0;

  const doneFlags = [dashboardDone, salesWorkspaceDone, workflowDone, executiveSummaryDone, yourCompanyDone];
  const firstNotDone = doneFlags.findIndex((done) => !done);
  const complete = firstNotDone === -1;
  const currentScreenIndex = complete ? 4 : firstNotDone;

  const screens: EnterpriseDemoScreen[] = SCREEN_LABELS.map((label, index) => ({ label, done: doneFlags[index] }));
  const remainingMinutes = complete ? 0 : SCREEN_MINUTES.slice(currentScreenIndex).reduce((sum, minutes) => sum + minutes, 0);

  const stageConfig = STAGE_CONFIG[deal.stage];
  const touchpointResult = stageConfig.touchpointId ? deal.aiResults[stageConfig.touchpointId] : undefined;

  const displayScreenIndex = complete ? currentScreenIndex : Math.max(currentScreenIndex, minScreenIndex);

  switch (displayScreenIndex) {
    case 0: {
      const topAction = buildRecommendedActions(company)[0];
      return {
        currentScreenIndex,
        screens,
        customerName,
        decision: "Where should the business focus today?",
        whyItMatters: "AINEX already reviewed the whole business this morning — here's what it found.",
        aiRecommendation: topAction?.text ?? "Everything looks steady — no urgent actions flagged this morning.",
        nextAction: "Open Sales Workspace",
        nextHref: "/workforce/sales/workspace",
        remainingMinutes,
        complete,
      };
    }
    case 1: {
      return {
        currentScreenIndex,
        screens,
        customerName,
        decision: `Should we move the ${customerName} opportunity forward?`,
        whyItMatters: `Estimated value RM${deal.estimatedValue.toLocaleString()} — currently at "${stageConfig.label}."`,
        aiRecommendation: touchpointResult?.businessRecommendation ?? "Run AI to get a recommendation for this step.",
        nextAction: stageConfig.nextStepLabel ?? (stageConfig.touchpointId ? "Run AI" : "Advance to the next step"),
        nextHref: "/workforce/sales/workspace",
        remainingMinutes,
        complete,
      };
    }
    case 2: {
      const isFinance = deal.stage === "pending-finance-review";
      return {
        currentScreenIndex,
        screens,
        customerName,
        decision: `Should ${customerName}'s quotation be approved?`,
        whyItMatters: `Current Responsible: ${stageConfig.responsibleRole}.`,
        aiRecommendation: touchpointResult?.businessRecommendation ?? "Run AI to get a recommendation before deciding.",
        nextAction: isFinance ? "Continue to Finance Approval" : "Continue to Manager Approval",
        nextHref: isFinance ? "/workforce/finance/workspace" : "/workforce/sales/workspace",
        remainingMinutes,
        complete,
      };
    }
    case 3: {
      const recommendation =
        (executiveResult && firstSectionItem(executiveResult.sections, "recommendedDecisions")) ??
        (assistantResult && firstSectionItem(assistantResult.sections, "personalRecommendations")) ??
        null;
      return {
        currentScreenIndex,
        screens,
        customerName,
        decision: "What should leadership prioritize this week?",
        whyItMatters: "Every department's work rolls up into one executive view here.",
        aiRecommendation: recommendation ?? "Run AI on the Executive Worker to see its recommendation.",
        nextAction: "Open Executive Assistant",
        nextHref: "/workforce/executive/workspace",
        remainingMinutes,
        complete,
      };
    }
    default: {
      if (complete) {
        return {
          currentScreenIndex,
          screens,
          customerName,
          decision: "Enterprise Demo Complete",
          whyItMatters: "AINEX just showed how it runs a company, and how quickly it learns yours.",
          aiRecommendation: null,
          nextAction: "Start a new demo",
          nextHref: "/dashboard",
          remainingMinutes,
          complete,
        };
      }
      return {
        currentScreenIndex,
        screens,
        customerName,
        decision: "Can AINEX understand MY company?",
        whyItMatters:
          "We've just shown how AINEX operates an enterprise. Now let's see how quickly AINEX understands your own business.",
        aiRecommendation: null,
        nextAction: "Experience AINEX with Your Company",
        nextHref: "/dashboard",
        remainingMinutes,
        complete,
      };
    }
  }
}
