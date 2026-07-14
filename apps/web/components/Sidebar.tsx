"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PresentationRoleSwitcher from "@/components/PresentationRoleSwitcher";
import ScenarioSwitcher from "@/components/ScenarioSwitcher";
import UserSwitcher from "@/components/UserSwitcher";
import type { CompanySize, Industry } from "@/lib/enterprise/EnterpriseTypes";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import type { PresentationRole } from "@/lib/enterprise/PresentationModeStore";

const navItems = [
  { label: "Executive Intelligence", href: "/dashboard" },
  { label: "Digital Workforce", href: "/workforce" },
  { label: "Enterprise Users", href: "/users" },
  { label: "Knowledge Hub", href: "/knowledge" },
  { label: "Workflow Automation", href: "/workflows" },
  { label: "Decision Center", href: "/decisions" },
  { label: "Presentation Mode", href: "/presentation" },
  { label: "Enterprise Integrations", href: "/integrations" },
  { label: "Executive Conversation", href: "/chat" },
  { label: "Settings", href: "/settings" },
];

export default function Sidebar({
  industry,
  size,
  users,
  currentUserId,
  isDemoModeEnabled,
  presentationRole,
}: {
  industry: Industry;
  size: CompanySize;
  users: EnterpriseUser[];
  currentUserId: string;
  isDemoModeEnabled: boolean;
  presentationRole: PresentationRole;
}) {
  const pathname = usePathname();

  // Presentation Mode wants minimal navigation — a full route-group
  // restructure was rejected (it would force every route to move and
  // trigger a full page reload on entry/exit); Sidebar already reads
  // usePathname() for active-link styling, so it self-gates here instead.
  if (pathname?.startsWith("/presentation")) {
    return (
      <aside className="w-56 shrink-0 border-r border-slate-800 p-6">
        <Link href="/dashboard" className="text-sm font-medium text-blue-400 hover:text-blue-300">
          ← Exit Presentation Mode
        </Link>
      </aside>
    );
  }

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

      <ScenarioSwitcher industry={industry} size={size} />
      <UserSwitcher users={users} currentUserId={currentUserId} />
      {isDemoModeEnabled && <PresentationRoleSwitcher role={presentationRole} />}
    </aside>
  );
}
