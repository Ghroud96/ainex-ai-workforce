import ModuleCard from "@/components/ModuleCard";
import PageHeader from "@/components/PageHeader";

const integrations = [
  { title: "ERP", description: "Sync inventory, orders, and financial data with your ERP system." },
  { title: "CRM", description: "Connect sales pipeline and customer records for the Sales Worker." },
  { title: "Email", description: "Let AI Workers read and draft emails on your behalf." },
  { title: "WhatsApp", description: "Reach customers and staff through WhatsApp Business." },
  { title: "Google Workspace", description: "Connect Gmail, Drive, and Calendar for company knowledge and scheduling." },
  { title: "Microsoft 365", description: "Connect Outlook, SharePoint, and Teams for enterprise workflows." },
];

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        title="Enterprise Integrations"
        description="Connect AINEX to the systems your business already runs on. More integrations are rolling out as AINEX grows."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => (
          <ModuleCard
            key={integration.title}
            title={integration.title}
            description={integration.description}
            status="Coming Soon"
            statusTone="slate"
          />
        ))}
      </div>
    </>
  );
}
