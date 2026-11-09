"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeReturnTo } from "@veyra/auth";
import { aiProposalDecisionSchema, askAiSchema } from "@veyra/contracts";
import {
  approveAiProposal,
  askMatterQuestion,
  isAppError,
  rejectAiProposal
} from "@veyra/core";
import { formString } from "@/lib/action-state";
import { getDb } from "@/lib/db";
import { requireActor } from "@/lib/session";

function withError(returnTo: string, message: string): never {
  const url = new URL(returnTo, "http://veyra.local");
  url.searchParams.set("error", message);
  redirect(`${url.pathname}${url.search}`);
}

export async function askAiAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = askAiSchema.safeParse({
    matterId: formString(formData, "matterId"),
    threadId: formString(formData, "threadId"),
    question: formString(formData, "question")
  });
  if (!parsed.success) withError(returnTo, "Choose a matter and ask a question of at least four characters.");

  let threadId: string;
  try {
    const actor = await requireActor();
    const result = await askMatterQuestion(await getDb(), actor, {
      matterId: parsed.data.matterId,
      threadId: parsed.data.threadId || undefined,
      question: parsed.data.question
    });
    threadId = result.threadId;
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/ai");
  revalidatePath(`/matters/${parsed.data.matterId}`);
  redirect(`/ai?thread=${threadId}`);
}

export async function approveAiProposalAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = aiProposalDecisionSchema.safeParse({
    proposalId: formString(formData, "proposalId"),
    note: formString(formData, "note")
  });
  if (!parsed.success) withError(returnTo, "Choose a valid proposal.");

  try {
    const actor = await requireActor();
    await approveAiProposal(
      await getDb(),
      actor,
      parsed.data.proposalId,
      parsed.data.note
    );
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/ai");
  revalidatePath("/tasks");
  redirect(returnTo);
}

export async function rejectAiProposalAction(formData: FormData): Promise<void> {
  const returnTo = safeReturnTo(formString(formData, "returnTo"));
  const parsed = aiProposalDecisionSchema.safeParse({
    proposalId: formString(formData, "proposalId"),
    note: formString(formData, "note")
  });
  if (!parsed.success) withError(returnTo, "Choose a valid proposal.");

  try {
    const actor = await requireActor();
    await rejectAiProposal(
      await getDb(),
      actor,
      parsed.data.proposalId,
      parsed.data.note
    );
  } catch (error) {
    if (isAppError(error)) withError(returnTo, error.message);
    throw error;
  }

  revalidatePath("/ai");
  redirect(returnTo);
}
