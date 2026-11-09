"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMatterSchema,
  createTaskSchema,
  matterStatusSchema,
  taskStatusSchema,
  updateTaskSchema
} from "@veyra/contracts";
import {
  createMatter,
  createTask,
  isAppError,
  updateMatter,
  updateTask
} from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import {
  formString,
  issuesToFieldErrors,
  type ActionState
} from "@/lib/action-state";

export async function createMatterAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAppSession();

  const parsed = createMatterSchema.safeParse({
    clientId: formString(formData, "clientId"),
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    practiceArea: formString(formData, "practiceArea"),
    matterType: formString(formData, "matterType"),
    stage: formString(formData, "stage"),
    responsibleUserId: formString(formData, "responsibleUserId"),
    restricted: formData.get("restricted") === "on"
  });

  if (!parsed.success) {
    return {
      error: "Check the matter details and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  let matterId: string;
  try {
    const matter = await createMatter(await getDb(), session.actor, parsed.data);
    matterId = matter.id;
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/matters");
  revalidatePath("/dashboard");
  redirect(`/matters/${matterId}`);
}

export async function updateMatterStatusAction(formData: FormData): Promise<void> {
  const session = await requireAppSession();
  const matterId = formString(formData, "matterId");
  const parsedStatus = matterStatusSchema.safeParse(formString(formData, "matterStatus"));
  if (!matterId || !parsedStatus.success) {
    redirect(`/matters/${matterId}?error=${encodeURIComponent("Choose a valid status")}`);
  }

  try {
    await updateMatter(await getDb(), session.actor, matterId, { status: parsedStatus.data });
  } catch (error) {
    if (isAppError(error)) {
      redirect(`/matters/${matterId}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/matters");
  revalidatePath("/dashboard");
  redirect(`/matters/${matterId}`);
}

export async function createTaskAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAppSession();

  const parsed = createTaskSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    matterId: formString(formData, "matterId") || undefined,
    assigneeUserId: formString(formData, "assigneeUserId") || undefined,
    priority: formString(formData, "priority") || "medium",
    dueOn: formString(formData, "dueOn")
  });

  if (!parsed.success) {
    return {
      error: "Check the task details and try again.",
      fieldErrors: issuesToFieldErrors(parsed.error.issues)
    };
  }

  try {
    await createTask(await getDb(), session.actor, {
      ...parsed.data,
      matterId: parsed.data.matterId ?? null,
      assigneeUserId: parsed.data.assigneeUserId ?? null
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (parsed.data.matterId) revalidatePath(`/matters/${parsed.data.matterId}`);
  return { success: "Task created" };
}

export async function updateTaskStatusAction(formData: FormData): Promise<void> {
  const session = await requireAppSession();
  const taskId = formString(formData, "taskId");
  const redirectTo = formString(formData, "redirectTo") || "/tasks";

  const parsed = taskStatusSchema.safeParse(formString(formData, "status"));
  if (!taskId || !parsed.success) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Invalid task update")}`);
  }

  const patch = updateTaskSchema.safeParse({ status: parsed.data });
  if (!patch.success) redirect(`${redirectTo}?error=${encodeURIComponent("Invalid task status")}`);

  try {
    await updateTask(await getDb(), session.actor, taskId, { status: parsed.data });
  } catch (error) {
    if (isAppError(error)) {
      redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  revalidatePath(redirectTo);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect(redirectTo);
}
