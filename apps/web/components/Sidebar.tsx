"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Executive Intelligence", href: "/dashboard" },
  { label: "Digital Workforce", href: "/workforce" },
  { label: "Knowledge Hub", href: "/knowledge" },
  { label: "Workflow Automation", href: "/workflows" },
  { label: "Enterprise Integrations", href: "/integrations" },
  { label: "AI Chat", href: "/chat" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 p-6">
      <h1 className="text-2xl font-bold">AINEX</h1>
      <p className="mt-2 text-sm text-slate-400">Enterprise Digital Workforce</p>

      <nav className="mt-10 space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg p-3 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
