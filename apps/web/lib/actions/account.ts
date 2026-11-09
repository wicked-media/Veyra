"use server";

import { redirect } from "next/navigation";
import { changePasswordSchema } from "@veyra/contracts";
import { changePassword, isAppError } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  formString,
  issuesToFieldErrors,
  type ActionState
} from "@/lib/action-state";

export async function changePasswordAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireSession();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formString(formData, "currentPassword"),
    newPassword: formString(formData, "newPassword"),
    confirmPassword: formString(formData, "confirmPassword")
  });

  if (!parsed.success) {
    return {
      error: "Check the password fields and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  try {
    await changePassword(await getDb(), session.actor, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect("/dashboard?password=updated");
}
