"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { cn } from "@veyra/ui";
import { BrandLockup } from "@/components/brand";
import type { NavSection } from "./nav";

interface SidebarProps {
  sections: NavSection[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  organisationName: string;
  roleLabel: string;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  sections,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  organisationName,
  roleLabel
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-line bg-sidebar text-sidebar-ink transition-[width,transform] duration-200",
          collapsed ? "w-[76px]" : "w-[268px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-line px-4">
          <Link href="/dashboard" onClick={onCloseMobile} className="rounded-md focus-visible:outline-offset-4">
            <BrandLockup compact={collapsed} />
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              className="hidden size-8 place-items-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-raised hover:text-sidebar-ink lg:grid"
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="grid size-8 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-raised hover:text-sidebar-ink lg:hidden"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-sidebar-muted/80">
                  {section.label}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-6 bg-sidebar-line" aria-hidden />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-sidebar-raised text-sidebar-ink"
                            : "text-sidebar-muted hover:bg-sidebar-raised/70 hover:text-sidebar-ink",
                          collapsed && "justify-center px-0"
                        )}
                      >
                        {active ? (
                          <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-teal-500" aria-hidden />
                        ) : null}
                        <Icon className="size-4 shrink-0" />
                        {!collapsed ? (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.stage ? (
                              <span className="rounded border border-sidebar-line px-1 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-sidebar-muted">
                                {item.stage === "Stage 3" || item.stage === "Stage 4" || item.stage === "Stage 6"
                                  ? "Soon"
                                  : item.stage}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-line p-3">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-lg bg-sidebar-raised/60 px-2.5 py-2.5",
              collapsed && "justify-center px-0"
            )}
          >
            <div className="grid size-7 shrink-0 place-items-center rounded-md bg-teal-500/15 text-[10px] font-semibold uppercase text-teal-500">
              {organisationName.slice(0, 2)}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-medium text-sidebar-ink">{organisationName}</p>
                <p className="truncate text-[10px] text-sidebar-muted">{roleLabel}</p>
              </div>
            ) : null}
          </div>
          {!collapsed ? (
            <p className="mt-2 px-1 text-[9px] leading-relaxed text-sidebar-muted/70">
              Session secured · activity audited
            </p>
          ) : null}
        </div>
      </aside>
    </>
  );
}
