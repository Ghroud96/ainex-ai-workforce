import { notFound } from "next/navigation";
import WorkerHeader from "@/components/WorkerHeader";
import WorkerTabs from "@/components/WorkerTabs";
import { WorkforceService } from "@/services/workforce/WorkforceService";

// Shared chrome across a worker's three sibling pages (Overview at the
// bare [slug] URL, Workspace, Intelligence) — renders WorkerHeader once so
// none of the three page files needs its own copy, plus the tab nav that
// switches between them.
export default async function WorkerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const workerInstance = WorkforceService.getById(slug);

  if (!workerInstance) {
    notFound();
  }

  const worker = WorkforceService.toCardData(workerInstance);

  return (
    <div className="max-w-5xl space-y-10">
      <WorkerHeader worker={worker} />
      <WorkerTabs slug={slug} />
      {children}
    </div>
  );
}
