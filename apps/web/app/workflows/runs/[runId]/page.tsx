import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import WorkflowRunDetail from "@/components/WorkflowRunDetail";
import { WorkflowService } from "@/lib/workflow/WorkflowService";

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await WorkflowService.getRun(runId);

  if (!run) {
    notFound();
  }

  const workflow = WorkflowService.getById(run.workflowId);

  if (!workflow) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title="Workflow Run Detail"
        description="Trace how this Workflow Automation run moved through each step, including where Intelligence was used or skipped."
      />
      <WorkflowRunDetail workflow={workflow} run={run} />
    </>
  );
}
