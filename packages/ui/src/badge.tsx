import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeTone = "neutral" | "teal" | "amber" | "red" | "blue" | "slate";

const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-canvas text-muted",
  teal: "border-teal-500/25 bg-teal-500/10 text-teal-600",
  amber: "border-warning/25 bg-warning/10 text-warning",
  red: "border-danger/25 bg-danger/10 text-danger",
  blue: "border-info/25 bg-info/10 text-info",
  slate: "border-line-strong bg-line/40 text-muted"
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden /> : null}
      {children}
    </span>
  );
}
