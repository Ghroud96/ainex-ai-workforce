import ModuleCard, { type ModuleCardProps } from "@/components/ModuleCard";
import PageHeader from "@/components/PageHeader";

const workflows: ModuleCardProps[] = [
  {
    title: "Lead Follow-Up",
    description: "Automatically notifies the Sales Worker when a lead goes quiet for 7+ days.",
    status: "Coming Soon",
    statusTone: "slate",
  },
  {
    title: "Invoice Reminders",
    description: "Sends payment reminders for overdue invoices flagged by the Finance Worker.",
    status: "Coming Soon",
    statusTone: "slate",
  },
  {
    title: "Low Stock Alerts",
    description: "Triggers a reorder workflow when inventory drops below its threshold.",
    status: "Coming Soon",
    statusTone: "slate",
  },
];

export default function WorkflowsPage() {
  return (
    <>
      <PageHeader
        title="Workflow Automation"
        description="AINEX workflows are powered by n8n, connecting your AI Workers to the tools and processes that run your business."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {workflows.map((workflow) => (
          <ModuleCard key={workflow.title} {...workflow} />
        ))}
      </div>
    </>
  );
}
