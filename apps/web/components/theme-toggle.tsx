"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem("veyra-theme", isDark ? "dark" : "light");
    } catch {
      // Storage can be unavailable in hardened browser profiles; the class
      // change still applies for this session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle colour theme"
      className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      <Moon className="size-4 dark:hidden" aria-hidden />
      <Sun className="hidden size-4 dark:block" aria-hidden />
    </button>
  );
}
