"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@veyra/auth";
import {
  createCalendarEventSchema,
  createDeadlineSchema,
  updateDeadlineStatusSchema,
  verifyDeadlineSchema
} from "@veyra/contracts";
import {
  createCalendarEvent,
  createDeadline,
  getOrganisation,
  isAppError,
  updateDeadlineStatus,
  verifyDeadline,
  zonedDateTimeToUtc
} from "@veyra/core";
import { formString } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { requireActor } from "@/lib/session";

function withError(returnTo: string, message: string): never {
  const url = new URL(returnTo, "http://veyra.local");
  url.searchParams.set("error", message);
  redirect(`${url.pathname}${url.search}`);
}

export async function createCalendarEventAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = createCalendarEventSchema.safeParse({
    matterId: formString(formData, "matterId"),
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    eventType: formString(formData, "eventType") || "other",
    startsAt: formString(formData, "startsAt"),
    endsAt: formString(formData, "endsAt"),
    location: formString(formData, "location"),
    assignedUserId: formString(formData, "assignedUserId")
  });
  if (!parsed.success) withError(returnTo, "Check the event details, start and end time.");

  try {
    const actor = await requireActor();
    const db = await getDb();
    const organisation = await getOrganisation(db, actor);
    await createCalendarEvent(db, actor, {
      matterId: parsed.data.matterId || null,
      title: parsed.data.title,
      description: parsed.data.description,
      eventType: parsed.data.eventType,
      startsAt: zonedDateTimeToUtc(parsed.data.startsAt, organisation.timezone),
      endsAt: parsed.data.endsAt
        ? zonedDateTimeToUtc(parsed.data.endsAt, organisation.timezone)
        : null,
      allDay: formData.get("allDay") === "on",
      location: parsed.data.location,
      assignedUserId: parsed.data.assignedUserId || null
    });
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/calendar");
  revalidatePath(returnTo.split("?")[0] ?? "/calendar");
  redirect(returnTo);
}

export async function createDeadlineAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = createDeadlineSchema.safeParse({
    matterId: formString(formData, "matterId"),
    title: formString(formData, "title"),
    category: formString(formData, "category") || "internal",
    dueOn: formString(formData, "dueOn"),
    notes: formString(formData, "notes")
  });
  if (!parsed.success) withError(returnTo, "Check the deadline title, matter and date.");

  try {
    const actor = await requireActor();
    await createDeadline(await getDb(), actor, parsed.data);
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/calendar");
  revalidatePath(returnTo.split("?")[0] ?? "/calendar");
  redirect(returnTo);
}

export async function verifyDeadlineAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = verifyDeadlineSchema.safeParse({
    deadlineId: formString(formData, "deadlineId")
  });
  if (!parsed.success) withError(returnTo, "Choose a valid deadline.");

  try {
    const actor = await requireActor();
    await verifyDeadline(await getDb(), actor, parsed.data.deadlineId);
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/calendar");
  revalidatePath(returnTo.split("?")[0] ?? "/calendar");
  redirect(returnTo);
}

export async function updateDeadlineStatusAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = updateDeadlineStatusSchema.safeParse({
    deadlineId: formString(formData, "deadlineId"),
    status: formString(formData, "status")
  });
  if (!parsed.success) withError(returnTo, "Choose a valid deadline status.");

  try {
    const actor = await requireActor();
    await updateDeadlineStatus(
      await getDb(),
      actor,
      parsed.data.deadlineId,
      parsed.data.status
    );
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/calendar");
  revalidatePath(returnTo.split("?")[0] ?? "/calendar");
  redirect(returnTo);
}
