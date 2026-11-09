"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, sessionCookieOptions, shouldUseSecureCookies } from "@veyra/auth";
import { signInSchema } from "@veyra/contracts";
import { isAppError, signIn, signOut, switchOrganisation } from "@veyra/core";
import { getDb } from "@/lib/db";
import { getRequestMeta } from "@/lib/session";
import {
  formString,
  issuesToFieldErrors,
  type ActionState
} from "@/lib/action-state";

export async function signInAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password")
  });

  if (!parsed.success) {
    return {
      error: "Check your email and password, then try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  let result;
  try {
    result = await signIn(await getDb(), parsed.data, await getRequestMeta());
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE,
    result.token,
    sessionCookieOptions(shouldUseSecureCookies())
  );

  redirect(result.mustChangePassword ? "/account/password" : "/dashboard");
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await signOut(await getDb(), token);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/sign-in");
}

export async function switchOrganisationAction(formData: FormData): Promise<void> {
  const organisationId = formString(formData, "organisationId");
  if (!organisationId) redirect("/dashboard");

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  try {
    await switchOrganisation(await getDb(), token, organisationId);
  } catch (error) {
    if (isAppError(error)) {
      redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
