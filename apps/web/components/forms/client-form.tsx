"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input, Select, Textarea } from "@veyra/ui";
import { createClientAction } from "@/lib/actions/clients";
import { emptyActionState } from "@/lib/action-state";

export function ClientForm() {
  const [state, formAction, pending] = useActionState(createClientAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs leading-relaxed text-danger"
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Client type" htmlFor="type">
          <Select id="type" name="type" defaultValue="individual">
            <option value="individual">Individual</option>
            <option value="organisation">Organisation</option>
          </Select>
        </Field>
        <Field label="Risk rating" htmlFor="riskRating" hint="KYC / AML screening is reviewed at intake">
          <Select id="riskRating" name="riskRating" defaultValue="low">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
      </div>

      <Field label="Client name" htmlFor="displayName" error={state.fieldErrors?.displayName?.[0]}>
        <Input id="displayName" name="displayName" required maxLength={200} placeholder="Full name or entity name" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" hint="Optional">
          <Input id="firstName" name="firstName" maxLength={120} />
        </Field>
        <Field label="Last name" htmlFor="lastName" hint="Optional">
          <Input id="lastName" name="lastName" maxLength={120} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation name" htmlFor="organisationName" hint="Optional">
          <Input id="organisationName" name="organisationName" maxLength={200} />
        </Field>
        <Field label="ABN" htmlFor="abn" hint="Optional">
          <Input id="abn" name="abn" maxLength={20} placeholder="00 000 000 000" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
          <Input id="email" name="email" type="email" maxLength={320} placeholder="client@example.com" />
        </Field>
        <Field label="Phone" htmlFor="phone" error={state.fieldErrors?.phone?.[0]}>
          <Input id="phone" name="phone" maxLength={40} placeholder="04xx xxx xxx" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Referral source" htmlFor="source" hint="Optional">
          <Input id="source" name="source" maxLength={120} placeholder="Referral, website, existing client" />
        </Field>
        <Field label="Notes" htmlFor="notes" hint="Visible to firm members only">
          <Textarea id="notes" name="notes" maxLength={4000} className="min-h-10" />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating client…" : "Create client"}
        </Button>
        <Link
          href="/clients"
          className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
