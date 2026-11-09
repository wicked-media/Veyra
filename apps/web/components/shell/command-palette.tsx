"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2, Search } from "lucide-react";
import { cn } from "@veyra/ui";
import type { FlatNavItem } from "./nav";

interface MatterHit {
  id: string;
  matterNumber: string;
  title: string;
  clientName: string;
}

interface ClientHit {
  id: string;
  displayName: string;
  type: string;
}

interface PaletteItem {
  key: string;
  label: string;
  hint: string;
  href: string;
  group: string;
  stage?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  navItems: FlatNavItem[];
}

export function CommandPalette({ open, onClose, navItems }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [matters, setMatters] = useState<MatterHit[]>([]);
  const [clients, setClients] = useState<ClientHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredNav = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return navItems;
    return navItems.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.section.toLowerCase().includes(term) ||
        item.href.toLowerCase().includes(term)
    );
  }, [navItems, query]);

  const items = useMemo<PaletteItem[]>(
    () => [
      ...filteredNav.map((item) => ({
        key: `nav:${item.href}`,
        label: item.label,
        hint: item.section,
        href: item.href,
        group: "Navigation",
        ...(item.stage ? { stage: item.stage } : {})
      })),
      ...matters.map((matter) => ({
        key: `matter:${matter.id}`,
        label: matter.title,
        hint: `${matter.matterNumber} · ${matter.clientName}`,
        href: `/matters/${matter.id}`,
        group: "Matters"
      })),
      ...clients.map((client) => ({
        key: `client:${client.id}`,
        label: client.displayName,
        hint: client.type === "organisation" ? "Organisation" : "Individual client",
        href: `/clients/${client.id}`,
        group: "Clients"
      }))
    ],
    [filteredNav, matters, clients]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setMatters([]);
    setClients([]);
    setFailed(false);
    setActiveIndex(0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 30);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) {
      setMatters([]);
      setClients([]);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          headers: { accept: "application/json" }
        });
        if (!response.ok) throw new Error("Search failed");
        const payload = (await response.json()) as {
          data?: { matters?: MatterHit[]; clients?: ClientHit[] };
        };
        setMatters(payload.data?.matters ?? []);
        setClients(payload.data?.clients ?? []);
        setFailed(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setFailed(true);
          setMatters([]);
          setClients([]);
        }
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, query]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (items.length ? (index + 1) % items.length : 0));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => (items.length ? (index - 1 + items.length) % items.length : 0));
        return;
      }
      if (event.key === "Enter") {
        const item = items[activeIndex];
        if (!item) return;
        event.preventDefault();
        onClose();
        router.push(item.href);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, items, activeIndex, onClose, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-navy-950/45 px-4 pt-[10vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      onMouseDown={onClose}
    >
      <div
        className="mx-auto flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-faint" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search matters, clients or jump to a page…"
            aria-label="Search matters, clients and navigation"
            className="h-14 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
          />
          {loading ? <Loader2 className="size-4 animate-spin text-faint" aria-hidden /> : null}
          <button
            type="button"
            onClick={onClose}
            className="kbd border border-line"
            aria-label="Close search"
          >
            Esc
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm font-medium text-ink">
                {query.trim().length >= 2 ? "No matches" : "Start typing to search"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {failed
                  ? "Search is temporarily unavailable. Check your connection and try again."
                  : query.trim().length >= 2
                    ? "Search covers matters and clients you are allowed to see."
                    : "Enter at least two characters, or choose a destination above."}
              </p>
            </div>
          ) : (
            <ul role="listbox" aria-label="Search results">
              {items.map((item, index) => {
                const showHeader = index === 0 || items[index - 1]?.group !== item.group;
                return (
                  <li key={item.key} role="option" aria-selected={index === activeIndex}>
                    {showHeader ? (
                      <p className="px-3 pb-1 pt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-faint">
                        {item.group}
                      </p>
                    ) : null}
                    <Link
                      href={item.href}
                      onClick={onClose}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                        index === activeIndex ? "bg-canvas text-ink" : "text-muted hover:bg-canvas"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {item.label}
                        </span>
                        <span className="block truncate text-[11px] text-faint">{item.hint}</span>
                      </span>
                      {item.stage ? (
                        <span className="text-[9px] uppercase tracking-wider text-faint">{item.stage}</span>
                      ) : null}
                      <ArrowUpRight className="size-3.5 shrink-0 text-faint" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-[10px] text-faint">
          <span className="flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="kbd">↵</kbd>
            to open
          </span>
          <span>Matter-scoped results only</span>
        </div>
      </div>
    </div>
  );
}
