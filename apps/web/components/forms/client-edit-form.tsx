"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select, Textarea } from "@veyra/ui";
import { updateClientAction } from "@/lib/actions/clients";
import { emptyActionState } from "@/lib/action-state";

interface ClientEditFormProps {
  client: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    riskRating: string;
    status: string;
    notes: string | null;
  };
  canArchive: boolean;
}

export function ClientEditForm({ client, canArchive }: ClientEditFormProps) {
  const [state, formAction, pending] = useActionState(updateClientAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="clientId" value={client.id} />

      <Field label="Client name" htmlFor="displayName" error={state.fieldErrors?.displayName?.[0]}>
        <Input id="displayName" name="displayName" defaultValue={client.displayName} required maxLength={200} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="edit-email" error={state.fieldErrors?.email?.[0]}>
          <Input id="edit-email" name="email" type="email" defaultValue={client.email ?? ""} maxLength={320} />
        </Field>
        <Field label="Phone" htmlFor="edit-phone" error={state.fieldErrors?.phone?.[0]}>
          <Input id="edit-phone" name="phone" defaultValue={client.phone ?? ""} maxLength={40} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Risk rating" htmlFor="edit-risk">
          <Select id="edit-risk" name="riskRating" defaultValue={client.riskRating}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
        <Field label="Client status" htmlFor="edit-status">
          <Select id="edit-status" name="status" defaultValue={client.status}>
            <option value="active">Active</option>
            <option value="archived" disabled={!canArchive}>
              Archived{canArchive ? "" : " (admin only)"}
            </option>
          </Select>
        </Field>
      </div>

      <Field label="Notes" htmlFor="edit-notes">
        <Textarea id="edit-notes" name="notes" defaultValue={client.notes ?? ""} maxLength={4000} />
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
        {pending ? "Saving…" : "Save client"}
      </Button>
    </form>
  );
}
