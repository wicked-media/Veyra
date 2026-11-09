"use client";

import Link from "next/link";
import { Building2, Check, ChevronDown, KeyRound, LogOut, Menu, Search, Settings } from "lucide-react";
import { ROLE_LABELS, type Role } from "@veyra/contracts";
import { cn } from "@veyra/ui";
import { signOutAction, switchOrganisationAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials } from "@/lib/format";

interface TopbarProps {
  actorName: string;
  actorEmail: string;
  role: Role;
  organisationName: string;
  organisationId: string;
  memberships: { organisationId: string; organisationName: string; role: Role }[];
  canManageFirm: boolean;
  onOpenMobile: () => void;
  onOpenCommand: () => void;
}

export function Topbar({
  actorName,
  actorEmail,
  role,
  organisationName,
  organisationId,
  memberships,
  canManageFirm,
  onOpenMobile,
  onOpenCommand
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted hover:text-ink lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <button
          type="button"
          onClick={onOpenCommand}
          className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-left text-xs text-faint transition-colors hover:border-line-strong"
        >
          <Search className="size-3.5 text-faint group-hover:text-muted" aria-hidden />
          <span className="flex-1 truncate">Search matters, clients and navigation</span>
          <span className="hidden items-center gap-0.5 sm:flex" aria-hidden>
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-ink [&::-webkit-details-marker]:hidden">
              <Building2 className="size-3.5" aria-hidden />
              <span className="hidden max-w-32 truncate font-medium sm:block">{organisationName}</span>
              <ChevronDown className="size-3.5" aria-hidden />
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              <div className="border-b border-line px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Your firms</p>
              </div>
              <div className="p-1.5">
                {memberships.map((membership) => (
                  <form action={switchOrganisationAction} key={membership.organisationId}>
                    <input type="hidden" name="organisationId" value={membership.organisationId} />
                    <button
                      type="submit"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-canvas",
                        membership.organisationId === organisationId ? "text-ink" : "text-muted"
                      )}
                    >
                      <span className="flex-1 truncate font-medium">{membership.organisationName}</span>
                      <span className="text-[10px] text-faint">{ROLE_LABELS[membership.role]}</span>
                      {membership.organisationId === organisationId ? (
                        <Check className="size-3.5 text-teal-600" aria-hidden />
                      ) : null}
                    </button>
                  </form>
                ))}
              </div>
              {canManageFirm ? (
                <div className="border-t border-line p-1.5">
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-canvas hover:text-ink"
                  >
                    <Settings className="size-3.5" aria-hidden />
                    Firm settings
                  </Link>
                </div>
              ) : null}
            </div>
          </details>

          <details className="group relative">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-line bg-surface pl-1.5 pr-2.5 transition-colors hover:border-line-strong [&::-webkit-details-marker]:hidden">
              <span className="grid size-6 place-items-center rounded-md bg-teal-500/15 text-[10px] font-semibold text-teal-600">
                {initials(actorName)}
              </span>
              <span className="hidden text-xs font-medium text-ink sm:block">{actorName}</span>
              <ChevronDown className="size-3.5 text-faint" aria-hidden />
            </summary>
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
              <div className="border-b border-line px-3.5 py-3">
                <p className="truncate text-xs font-semibold text-ink">{actorName}</p>
                <p className="truncate text-[11px] text-muted">{actorEmail}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-faint">{ROLE_LABELS[role]}</p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/account/password"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-canvas hover:text-ink"
                >
                  <KeyRound className="size-3.5" aria-hidden />
                  Change password
                </Link>
                {canManageFirm ? (
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-canvas hover:text-ink"
                  >
                    <Settings className="size-3.5" aria-hidden />
                    Administration
                  </Link>
                ) : null}
              </div>
              <form action={signOutAction} className="border-t border-line p-1.5">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-canvas hover:text-ink"
                >
                  <LogOut className="size-3.5" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
