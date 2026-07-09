// "Demo Knowledge" vs "Your Company Knowledge" — the one place this
// distinction is rendered, so every surface (document cards, the document
// table, the document detail header) reads identically. Blue for a real
// customer upload since that's the moment this demo wants to stand out;
// slate for seeded demo fiction, matching TagBadge's default neutral tone.
export default function KnowledgeSourceBadge({ source }: { source: "demo" | "customer-upload" }) {
  if (source === "customer-upload") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
        Your Company Knowledge
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
      Demo Knowledge
    </span>
  );
}
