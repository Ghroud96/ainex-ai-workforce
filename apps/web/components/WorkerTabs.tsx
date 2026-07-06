"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Modeled on Sidebar.tsx's active-link pattern, but using EXACT equality
// for all three tabs, never startsWith — Overview's URL is a strict prefix
// of both /workspace and /intelligence, so startsWith would incorrectly
// double-highlight Overview on the other two tabs.
export default function WorkerTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/workforce/${slug}`;
  const tabs = [
    { label: "Overview", href: base },
    { label: "Workspace", href: `${base}/workspace` },
    { label: "Intelligence", href: `${base}/intelligence` },
  ];

  return (
    <nav className="flex gap-1 border-b border-slate-800">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active ? "border-blue-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
