import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, detail, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(10,30,40,0.03)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-faint">{label}</p>
        {icon ? <span className="text-teal-600">{icon}</span> : null}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums tracking-tight text-ink">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}
