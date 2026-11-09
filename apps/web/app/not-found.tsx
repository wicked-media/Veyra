import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-600">
          404 · Not found
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink">
          That record is not available
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The page may have moved, or the matter may be subject to a restriction or ethical wall.
          If you believe you should have access, speak to your firm administrator.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-teal-500 px-4 text-sm font-medium text-navy-950 hover:bg-teal-400"
        >
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
