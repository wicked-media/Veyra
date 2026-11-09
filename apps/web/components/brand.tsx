import { cn } from "@veyra/ui";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-8", className)}>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="9" fill="currentColor" opacity="0.14" />
      <path
        d="M8.5 10.25 16 22.25l7.5-12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.25 10.25h7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark className="size-8 text-teal-500" />
      {!compact ? (
        <div className="leading-none">
          <p className="font-display text-[17px] font-semibold tracking-[0.18em] text-sidebar-ink">VEYRA</p>
          <p className="mt-1 text-[8.5px] font-medium uppercase tracking-[0.22em] text-sidebar-muted">
            Legal operating system
          </p>
        </div>
      ) : null}
    </div>
  );
}
