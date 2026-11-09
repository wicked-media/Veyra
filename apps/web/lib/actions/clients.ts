"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClientSchema, updateClientSchema } from "@veyra/contracts";
import { createClient, isAppError, updateClient } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import {
  formString,
  issuesToFieldErrors,
  type ActionState
} from "@/lib/action-state";

export async function createClientAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAppSession();

  const parsed = createClientSchema.safeParse({
    type: formString(formData, "type"),
    displayName: formString(formData, "displayName"),
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    organisationName: formString(formData, "organisationName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    abn: formString(formData, "abn"),
    riskRating: formString(formData, "riskRating") || "low",
    source: formString(formData, "source"),
    notes: formString(formData, "notes")
  });

  if (!parsed.success) {
    return {
      error: "Check the client details and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  let clientId: string;
  try {
    const client = await createClient(await getDb(), session.actor, parsed.data);
    clientId = client.id;
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  redirect(`/clients/${clientId}`);
}

export async function updateClientAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAppSession();
  const clientId = formString(formData, "clientId");

  const parsed = updateClientSchema.safeParse({
    displayName: formString(formData, "displayName") || undefined,
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    riskRating: formString(formData, "riskRating") || undefined,
    notes: formString(formData, "notes"),
    status: formString(formData, "status") || undefined
  });

  if (!parsed.success) {
    return {
      error: "Check the client details and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  try {
    await updateClient(await getDb(), session.actor, clientId, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return { success: "Client updated" };
}
