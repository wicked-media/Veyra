"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  PRACTICE_AREAS,
  PRACTICE_AREA_LABELS,
  type PracticeArea
} from "@veyra/contracts";
import { Button, Field, Input, Select, Textarea } from "@veyra/ui";
import { createMatterAction } from "@/lib/actions/matters";
import { emptyActionState } from "@/lib/action-state";

interface MatterFormProps {
  clients: { id: string; displayName: string; type: string }[];
  members: { userId: string; name: string; role: string }[];
  defaultResponsibleUserId: string;
}

export function MatterForm({ clients, members, defaultResponsibleUserId }: MatterFormProps) {
  const [state, formAction, pending] = useActionState(createMatterAction, emptyActionState);

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
        <Field label="Client" htmlFor="clientId" error={state.fieldErrors?.clientId?.[0]}>
          <Select id="clientId" name="clientId" required defaultValue="">
            <option value="" disabled>
              Select a client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.displayName}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Responsible practitioner"
          htmlFor="responsibleUserId"
          error={state.fieldErrors?.responsibleUserId?.[0]}
        >
          <Select
            id="responsibleUserId"
            name="responsibleUserId"
            required
            defaultValue={defaultResponsibleUserId}
          >
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Matter title" htmlFor="title" error={state.fieldErrors?.title?.[0]}>
        <Input
          id="title"
          name="title"
          required
          maxLength={240}
          placeholder="e.g. Harbourline — Northshore retail lease"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Practice area" htmlFor="practiceArea" error={state.fieldErrors?.practiceArea?.[0]}>
          <Select id="practiceArea" name="practiceArea" required defaultValue="commercial">
            {PRACTICE_AREAS.map((area: PracticeArea) => (
              <option key={area} value={area}>
                {PRACTICE_AREA_LABELS[area]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Matter type" htmlFor="matterType" hint="Optional — e.g. Probate, Commercial lease">
          <Input id="matterType" name="matterType" maxLength={120} placeholder="Matter type" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current stage" htmlFor="stage" hint="Optional — shown on the matter workspace">
          <Input id="stage" name="stage" maxLength={120} placeholder="e.g. Discovery" />
        </Field>
        <div className="rounded-lg border border-line bg-canvas/60 p-3.5">
          <label className="flex items-start gap-2.5 text-xs text-muted">
            <input
              type="checkbox"
              name="restricted"
              className="mt-0.5 size-4 rounded border-line accent-teal-500"
            />
            <span>
              <span className="block font-medium text-ink">Restricted matter</span>
              Only the matter team can see it. Add team members and ethical walls after opening.
            </span>
          </label>
        </div>
      </div>

      <Field label="Description" htmlFor="description" error={state.fieldErrors?.description?.[0]}>
        <Textarea
          id="description"
          name="description"
          maxLength={4000}
          placeholder="Scope, key facts and anything the matter team needs at a glance."
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button type="submit" disabled={pending}>
          {pending ? "Opening matter…" : "Open matter"}
        </Button>
        <Link
          href="/matters"
          className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted hover:bg-canvas hover:text-ink"
        >
          Cancel
        </Link>
        <p className="ml-auto text-[11px] text-faint">A matter number is allocated automatically.</p>
      </div>
    </form>
  );
}
