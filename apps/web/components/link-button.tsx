import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@veyra/ui";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-teal-500 text-navy-950 shadow-sm hover:bg-teal-400 border border-teal-500/60",
  secondary: "bg-surface text-ink border border-line hover:border-line-strong hover:bg-canvas",
  ghost: "text-muted hover:bg-canvas hover:text-ink"
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2"
};

export function LinkButton({
  href,
  variant = "secondary",
  size = "md",
  className,
  children
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </Link>
  );
}
