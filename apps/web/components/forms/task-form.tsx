"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select } from "@veyra/ui";
import { createTaskAction } from "@/lib/actions/matters";
import { emptyActionState } from "@/lib/action-state";

interface TaskFormProps {
  members: { userId: string; name: string }[];
  matters?: { id: string; matterNumber: string; title: string }[];
  matterId?: string;
}

export function TaskForm({ members, matters, matterId }: TaskFormProps) {
  const [state, formAction, pending] = useActionState(createTaskAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4">
      {matterId ? <input type="hidden" name="matterId" value={matterId} /> : null}

      <Field label="Task" htmlFor="task-title" error={state.fieldErrors?.title?.[0]}>
        <Input id="task-title" name="title" required maxLength={240} placeholder="What needs to happen?" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Assign to" htmlFor="task-assignee">
          <Select id="task-assignee" name="assigneeUserId" defaultValue="">
            <option value="">Me (default)</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="task-priority">
          <Select id="task-priority" name="priority" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due date" htmlFor="task-due" hint="Shown in your task list and on the matter">
          <Input id="task-due" name="dueOn" type="date" />
        </Field>
        {matters ? (
          <Field label="Matter" htmlFor="task-matter" hint="Leave blank for a firm-level task">
            <Select id="task-matter" name="matterId" defaultValue={matterId ?? ""}>
              <option value="">No matter</option>
              {matters.map((matter) => (
                <option key={matter.id} value={matter.id}>
                  {matter.matterNumber} · {matter.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

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
        {pending ? "Creating…" : "Create task"}
      </Button>
    </form>
  );
}
