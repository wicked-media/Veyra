import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  FolderClosed,
  Landmark,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  permission?: string;
  stage?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Matters", href: "/matters", icon: Briefcase, permission: "matter:read" },
      { label: "Clients", href: "/clients", icon: Users, permission: "client:read" },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, permission: "task:read" }
    ]
  },
  {
    label: "Practice intelligence",
    items: [
      {
        label: "Documents",
        href: "/documents",
        icon: FolderClosed,
        permission: "document:read"
      },
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        permission: "calendar:read"
      },
      { label: "AI assistant", href: "/ai", icon: Sparkles, permission: "ai:use" },
      {
        label: "Research",
        href: "/research",
        icon: BookOpen,
        permission: "integration:read",
        stage: "Stage 6"
      },
      {
        label: "Insights",
        href: "/insights",
        icon: BarChart3,
        permission: "report:read"
      }
    ]
  },
  {
    label: "Firm operations",
    items: [
      {
        label: "Time & billing",
        href: "/billing",
        icon: Receipt,
        permission: "billing:read",
        stage: "Stage 6"
      },
      {
        label: "Trust",
        href: "/trust",
        icon: Landmark,
        permission: "trust:read",
        stage: "Locked"
      },
      {
        label: "Administration",
        href: "/admin",
        icon: ShieldCheck,
        permission: "org:read"
      }
    ]
  }
];

export function navigationFor(permissions: readonly string[]): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.permission || permissions.includes(item.permission)
    )
  })).filter((section) => section.items.length > 0);
}

export interface FlatNavItem {
  label: string;
  href: string;
  section: string;
  stage?: string;
}

export function flattenNavigation(sections: NavSection[]): FlatNavItem[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({
      label: item.label,
      href: item.href,
      section: section.label,
      ...(item.stage ? { stage: item.stage } : {})
    }))
  );
}
