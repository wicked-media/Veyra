"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@veyra/ui";
import { signInAction } from "@/lib/actions/auth";
import { emptyActionState } from "@/lib/action-state";

export function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field label="Email address" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          placeholder="you@firm.com.au"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
          aria-invalid={Boolean(state.fieldErrors?.password)}
          aria-describedby={state.fieldErrors?.password ? "password-error" : undefined}
        />
      </Field>

      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs leading-relaxed text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? "Signing you in…" : "Sign in"}
      </Button>

      <p className="text-center text-[11px] leading-relaxed text-faint">
        Trouble signing in? Contact your firm administrator. Sessions expire after 12 hours.
      </p>
    </form>
  );
}
