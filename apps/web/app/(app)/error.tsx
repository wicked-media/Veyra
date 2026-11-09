"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@veyra/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-line bg-surface p-8">
      <div className="grid size-11 place-items-center rounded-xl border border-danger/20 bg-danger/10 text-danger">
        <CircleAlert className="size-5" aria-hidden />
      </div>
      <h1 className="mt-4 font-display text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The request could not be completed. The error has been logged with a request reference.
        No changes were saved unless the page confirms otherwise.
      </p>
      <Button type="button" className="mt-5" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
