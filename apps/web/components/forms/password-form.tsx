"use client";

import { useActionState } from "react";
import { Button, Field, Input } from "@veyra/ui";
import { changePasswordAction } from "@/lib/actions/account";
import { emptyActionState } from "@/lib/action-state";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Current password" htmlFor="currentPassword" error={state.fieldErrors?.currentPassword?.[0]}>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="New password"
        htmlFor="newPassword"
        hint="At least 12 characters with a letter and a number"
        error={state.fieldErrors?.newPassword?.[0]}
      >
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirmPassword" error={state.fieldErrors?.confirmPassword?.[0]}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      {state.error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Updating password…" : "Update password"}
      </Button>

      <p className="text-[11px] leading-relaxed text-faint">
        Changing your password signs out every other device. Your current session remains active.
      </p>
    </form>
  );
}
