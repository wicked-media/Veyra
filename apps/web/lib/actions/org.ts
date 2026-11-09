"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  inviteMemberSchema,
  roleSchema,
  updateOrgSettingsSchema
} from "@veyra/contracts";
import {
  inviteMember,
  isAppError,
  updateMemberRole,
  updateOrganisationSettings
} from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import {
  formString,
  issuesToFieldErrors,
  type ActionState
} from "@/lib/action-state";

export async function inviteMemberAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAppSession();

  const parsed = inviteMemberSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    role: formString(formData, "role"),
    title: formString(formData, "title")
  });

  if (!parsed.success) {
    return {
      error: "Check the member details and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  try {
    const result = await inviteMember(await getDb(), session.actor, parsed.data);
    revalidatePath("/admin/members");
    return {
      success: result.temporaryPassword
        ? "Account created. Share the temporary password securely; it is shown once."
        : "Member added to the firm.",
      ...(result.temporaryPassword ? { temporaryPassword: result.temporaryPassword } : {})
    };
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
}

export async function updateMemberRoleAction(formData: FormData): Promise<void> {
  const session = await requireAppSession();
  const membershipId = formString(formData, "membershipId");
  const role = roleSchema.safeParse(formString(formData, "role"));

  if (!membershipId || !role.success) {
    redirect("/admin/members?error=Invalid+role+change");
  }

  try {
    await updateMemberRole(await getDb(), session.actor, membershipId, role.data);
  } catch (error) {
    if (isAppError(error)) {
      redirect(`/admin/members?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/roles");
  redirect("/admin/members?updated=1");
}

export async function updateOrgSettingsAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAppSession();

  const parsed = updateOrgSettingsSchema.safeParse({
    name: formString(formData, "name"),
    matterNumberPrefix: formString(formData, "matterNumberPrefix"),
    timezone: formString(formData, "timezone"),
    financialYearStartMonth: formString(formData, "financialYearStartMonth")
  });

  if (!parsed.success) {
    return {
      error: "Check the firm settings and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  try {
    await updateOrganisationSettings(await getDb(), session.actor, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: "Firm settings saved" };
}
