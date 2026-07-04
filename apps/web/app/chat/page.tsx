import ChatPanel from "@/components/ChatPanel";
import PageHeader from "@/components/PageHeader";

export default function ChatPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="AI Chat" description="Ask AINEX anything about your business." />

      <ChatPanel
        initialMessages={[
          {
            role: "user",
            content: "How is my company doing today?",
          },
          {
            role: "ai",
            content:
              "Revenue increased by 18%, but inventory risk was detected for Ganick Ginger. ABC Distributor has not reordered for 27 days. Recommendation: contact ABC Distributor today.",
          },
        ]}
      />
    </div>
  );
}
