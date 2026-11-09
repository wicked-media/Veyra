import type { ReactNode } from "react";
import { cn } from "./cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  stage?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, stage, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-10",
        className
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-canvas text-teal-600">
        {icon}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {stage ? (
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              {stage}
            </span>
          ) : null}
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
