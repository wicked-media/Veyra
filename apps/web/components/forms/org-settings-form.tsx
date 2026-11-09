"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select } from "@veyra/ui";
import { updateOrgSettingsAction } from "@/lib/actions/org";
import { emptyActionState } from "@/lib/action-state";

const TIMEZONES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Hobart",
  "Australia/Canberra"
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

interface OrgSettingsFormProps {
  organisation: {
    name: string;
    matterNumberPrefix: string;
    timezone: string;
    financialYearStartMonth: number;
  };
}

export function OrgSettingsForm({ organisation }: OrgSettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateOrgSettingsAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Firm name" htmlFor="org-name" error={state.fieldErrors?.name?.[0]}>
        <Input id="org-name" name="name" defaultValue={organisation.name} required maxLength={160} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Matter number prefix"
          htmlFor="org-prefix"
          hint="Uppercase letters and numbers, 2–8 characters"
          error={state.fieldErrors?.matterNumberPrefix?.[0]}
        >
          <Input
            id="org-prefix"
            name="matterNumberPrefix"
            defaultValue={organisation.matterNumberPrefix}
            required
            maxLength={8}
            pattern="[A-Z0-9]{2,8}"
          />
        </Field>

        <Field label="Financial year starts" htmlFor="org-fy">
          <Select
            id="org-fy"
            name="financialYearStartMonth"
            defaultValue={String(organisation.financialYearStartMonth)}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={String(index + 1)}>
                {month}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Firm time zone" htmlFor="org-timezone" error={state.fieldErrors?.timezone?.[0]}>
        <Select id="org-timezone" name="timezone" defaultValue={organisation.timezone}>
          {[...new Set([organisation.timezone, ...TIMEZONES])].map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </Select>
      </Field>

      {state.error ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-xs font-medium text-positive">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
