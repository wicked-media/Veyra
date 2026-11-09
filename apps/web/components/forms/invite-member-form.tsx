"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select } from "@veyra/ui";
import { inviteMemberAction } from "@/lib/actions/org";
import { emptyActionState } from "@/lib/action-state";

export function InviteMemberForm({ canAssignPrivilegedRoles }: { canAssignPrivilegedRoles: boolean }) {
  const [state, formAction, pending] = useActionState(inviteMemberAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="invite-name" error={state.fieldErrors?.name?.[0]}>
          <Input id="invite-name" name="name" required maxLength={120} />
        </Field>
        <Field label="Email" htmlFor="invite-email" error={state.fieldErrors?.email?.[0]}>
          <Input id="invite-email" name="email" type="email" required maxLength={320} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue="solicitor">
            <option value="solicitor">Solicitor</option>
            <option value="principal">Principal</option>
            <option value="paralegal">Paralegal</option>
            <option value="accounts">Accounts</option>
            {canAssignPrivilegedRoles ? <option value="admin">Firm administrator</option> : null}
            {canAssignPrivilegedRoles ? <option value="owner">Owner</option> : null}
          </Select>
        </Field>
        <Field label="Title" htmlFor="invite-title" hint="Optional — e.g. Senior Associate">
          <Input id="invite-title" name="title" maxLength={120} />
        </Field>
      </div>

      {state.error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <div className="rounded-lg border border-positive/25 bg-positive/10 px-3.5 py-3 text-xs leading-relaxed text-positive">
          <p className="font-medium">{state.success}</p>
          {state.temporaryPassword ? (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">Temporary password</p>
              <code className="mt-1 block select-all break-all rounded border border-positive/20 bg-surface px-2.5 py-2 font-mono text-[12px] text-ink">
                {state.temporaryPassword}
              </code>
              <p className="mt-1.5 text-[10.5px]">
                They must change it at first sign-in. Email delivery is not connected in this build.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Adding member…" : "Add member"}
      </Button>
    </form>
  );
}
