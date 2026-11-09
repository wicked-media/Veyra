"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ROLE_LABELS, type Role } from "@veyra/contracts";
import { cn } from "@veyra/ui";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { flattenNavigation, navigationFor } from "./nav";

interface ShellActor {
  name: string;
  email: string;
  role: Role;
  permissions: readonly string[];
}

interface ShellOrganisation {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

interface AppShellProps {
  actor: ShellActor;
  organisation: ShellOrganisation;
  memberships: { organisationId: string; organisationName: string; role: Role }[];
  children: ReactNode;
}

export function AppShell({ actor, organisation, memberships, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const sections = navigationFor(actor.permissions);
  const navItems = flattenNavigation(sections);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-lg focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        Skip to content
      </a>

      <Sidebar
        sections={sections}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        organisationName={organisation.name}
        roleLabel={ROLE_LABELS[actor.role]}
      />

      <div
        className={cn(
          "flex min-h-dvh flex-col transition-[padding] duration-200",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]"
        )}
      >
        <Topbar
          actorName={actor.name}
          actorEmail={actor.email}
          role={actor.role}
          organisationName={organisation.name}
          organisationId={organisation.id}
          memberships={memberships}
          canManageFirm={actor.permissions.includes("org:manage")}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenCommand={() => setCommandOpen(true)}
        />

        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 text-[9.5px] uppercase tracking-[0.16em] text-faint sm:px-6 lg:px-8">
          Veyra · One platform · Every practice · Every matter
        </footer>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} navItems={navItems} />
    </div>
  );
}
