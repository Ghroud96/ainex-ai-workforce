import ModuleCard from "@/components/ModuleCard";
import PageHeader from "@/components/PageHeader";
import { WorkforceService } from "@/services/workforce/WorkforceService";

const integrations = [
  { title: "ERP", description: "Sync inventory, orders, and financial data with your ERP system." },
  { title: "CRM", description: "Connect sales pipeline and customer records for the Sales Worker." },
  { title: "Email", description: "Let your Digital Workforce read and draft emails on your behalf." },
  { title: "WhatsApp", description: "Reach customers and staff through WhatsApp Business." },
  { title: "Google Workspace", description: "Connect Gmail, Drive, and Calendar for company knowledge and scheduling." },
  { title: "Microsoft 365", description: "Connect Outlook, SharePoint, and Teams for enterprise workflows." },
];

export default function IntegrationsPage() {
  const workers = WorkforceService.getAll().map((worker) => WorkforceService.toCardData(worker));

  return (
    <>
      <PageHeader
        title="Enterprise Integrations"
        description="Connect AINEX to the systems your business already runs on — each one maps directly to a Digital Worker's tools, not a generic plugin list."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const workersUsingTool = workers.filter((worker) => worker.tools.includes(integration.title));
          const isWired = workersUsingTool.length > 0;

          return (
            <ModuleCard
              key={integration.title}
              title={integration.title}
              description={integration.description}
              detail={
                isWired
                  ? `Used by ${workersUsingTool.map((worker) => worker.name).join(", ")}`
                  : "Not yet used by a Digital Worker in this deployment."
              }
              status={isWired ? "Wired to Digital Workforce" : "Coming Soon"}
              statusTone={isWired ? "green" : "slate"}
            />
          );
        })}
      </div>
    </>
  );
}
