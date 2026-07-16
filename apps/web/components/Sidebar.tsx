"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PresentationRoleSwitcher from "@/components/PresentationRoleSwitcher";
import ScenarioSwitcher from "@/components/ScenarioSwitcher";
import UserSwitcher from "@/components/UserSwitcher";
import type { CompanySize, Industry } from "@/lib/enterprise/EnterpriseTypes";
import type { EnterpriseUser } from "@/lib/enterprise/EnterpriseUserTypes";
import type { PresentationRole } from "@/lib/enterprise/PresentationModeStore";

// One minimal stroke icon per top-level nav item — decorative only, no
// icon library dependency. Kept in this file since nothing else needs
// them; extract to components/icons/ if a second consumer ever appears.
function NavIcon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px] shrink-0",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M4 14v-4M10 14V6M16 14v-7" />
        </svg>
      );
    case "workforce":
      return (
        <svg {...common}>
          <circle cx="7" cy="6.5" r="2.25" />
          <path d="M2.5 16c.6-2.7 2.4-4 4.5-4s3.9 1.3 4.5 4" />
          <circle cx="14.5" cy="7" r="1.75" />
          <path d="M12 12.3c.5-1.7 1.7-2.6 3.3-2.6 1.8 0 3.2 1.1 3.7 3.3" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="10" cy="6.5" r="3" />
          <path d="M3.5 16.5c.9-3.5 3.2-5.3 6.5-5.3s5.6 1.8 6.5 5.3" />
        </svg>
      );
    case "knowledge":
      return (
        <svg {...common}>
          <path d="M3 4.5c1.5-.7 3.4-.7 4.9 0 .3.1.6.4.6.7v9.8a.5.5 0 0 1-.7.5c-1.4-.6-3.1-.6-4.5 0-.3.1-.6-.1-.6-.4V5a.5.5 0 0 1 .3-.5Z" />
          <path d="M17 4.5c-1.5-.7-3.4-.7-4.9 0-.3.1-.6.4-.6.7v9.8a.5.5 0 0 0 .7.5c1.4-.6 3.1-.6 4.5 0 .3.1.6-.1.6-.4V5a.5.5 0 0 0-.3-.5Z" />
        </svg>
      );
    case "workflows":
      return (
        <svg {...common}>
          <circle cx="4.5" cy="5" r="1.75" />
          <circle cx="4.5" cy="15" r="1.75" />
          <circle cx="15.5" cy="10" r="1.75" />
          <path d="M6.2 5.7 13.9 9M6.2 14.3 13.9 11" />
        </svg>
      );
    case "decisions":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="7" />
          <path d="M7 10.2 9 12l4-4.5" />
        </svg>
      );
    case "presentation":
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="15" height="9.5" rx="1.5" />
          <path d="M7 17h6M10 13.5V17" />
        </svg>
      );
    case "integrations":
      return (
        <svg {...common}>
          <path d="M8 6.5H5.5A2.5 2.5 0 0 0 3 9v0a2.5 2.5 0 0 0 2.5 2.5H8M12 6.5h2.5A2.5 2.5 0 0 1 17 9v0a2.5 2.5 0 0 1-2.5 2.5H12M7 9h6" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h11A1.5 1.5 0 0 1 17 5.5v6A1.5 1.5 0 0 1 15.5 13H9l-3.5 3v-3H4.5A1.5 1.5 0 0 1 3 11.5v-6Z" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="2.75" />
          <path d="M10 3.5v1.6M10 14.9v1.6M16.5 10h-1.6M5.1 10H3.5M14.6 5.4l-1.1 1.1M6.5 13.5l-1.1 1.1M14.6 14.6l-1.1-1.1M6.5 6.5 5.4 5.4" />
        </svg>
      );
    default:
      return null;
  }
}

const navItems = [
  { label: "Executive Intelligence", href: "/dashboard", icon: "dashboard" },
  { label: "Digital Workforce", href: "/workforce", icon: "workforce" },
  { label: "Enterprise Users", href: "/users", icon: "users" },
  { label: "Knowledge Hub", href: "/knowledge", icon: "knowledge" },
  { label: "Workflow Automation", href: "/workflows", icon: "workflows" },
  { label: "Decision Center", href: "/decisions", icon: "decisions" },
  { label: "Presentation Mode", href: "/presentation", icon: "presentation" },
  { label: "Enterprise Integrations", href: "/integrations", icon: "integrations" },
  { label: "Executive Conversation", href: "/chat", icon: "chat" },
  { label: "Settings", href: "/settings", icon: "settings" },
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
      <aside className="w-56 shrink-0 border-r border-slate-200/70 bg-white p-8">
        <Link href="/dashboard" className="text-sm font-medium text-blue-700 hover:text-blue-800">
          ← Exit Presentation Mode
        </Link>
      </aside>
    );
  }

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200/70 bg-white p-8">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">AINEX</h1>
      <p className="mt-1 text-xs text-slate-400">Enterprise Digital Workforce</p>

      <nav className="mt-10 space-y-0.5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-blue-600 bg-blue-50 font-medium text-blue-700"
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <NavIcon name={item.icon} />
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
