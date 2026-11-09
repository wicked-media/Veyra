import { Button } from "@veyra/ui";
import { updateTaskStatusAction } from "@/lib/actions/matters";

export function TaskCompleteForm({
  taskId,
  status,
  redirectTo
}: {
  taskId: string;
  status: string;
  redirectTo: string;
}) {
  const isDone = status === "done";
  return (
    <form action={updateTaskStatusAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="status" value={isDone ? "todo" : "done"} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button type="submit" variant={isDone ? "ghost" : "subtle"} size="sm">
        {isDone ? "Reopen" : "Mark done"}
      </Button>
    </form>
  );
}
