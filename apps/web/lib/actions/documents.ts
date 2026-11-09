"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { archiveDocumentSchema } from "@veyra/contracts";
import { archiveDocument, isAppError } from "@veyra/core";
import { safeReturnTo } from "@veyra/auth";
import { formString } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { requireActor } from "@/lib/session";

function errorRedirect(returnTo: string, message: string): never {
  const url = new URL(returnTo, "http://veyra.local");
  url.searchParams.set("error", message);
  redirect(`${url.pathname}${url.search}`);
}

export async function archiveDocumentAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = archiveDocumentSchema.safeParse({
    documentId: formString(formData, "documentId")
  });
  if (!parsed.success) errorRedirect(returnTo, "Choose a valid document.");

  try {
    const actor = await requireActor();
    await archiveDocument(await getDb(), actor, parsed.data.documentId);
  } catch (error) {
    if (isAppError(error)) errorRedirect(returnTo, error.message);
    throw error;
  }

  revalidatePath("/documents");
  revalidatePath(returnTo.split("?")[0] ?? "/documents");
  redirect(returnTo);
}
