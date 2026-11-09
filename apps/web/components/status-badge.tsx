import { Badge } from "@veyra/ui";
import {
  MATTER_STATUS_LABELS,
  RISK_RATING_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type MatterStatus,
  type RiskRating,
  type TaskPriority,
  type TaskStatus
} from "@veyra/contracts";

const matterTones: Record<MatterStatus, "teal" | "amber" | "neutral" | "slate"> = {
  open: "teal",
  on_hold: "amber",
  closed: "neutral",
  archived: "slate"
};

const taskTones: Record<TaskStatus, "neutral" | "blue" | "teal" | "slate"> = {
  todo: "neutral",
  in_progress: "blue",
  done: "teal",
  cancelled: "slate"
};

const priorityTones: Record<TaskPriority, "neutral" | "blue" | "amber" | "red"> = {
  low: "neutral",
  medium: "blue",
  high: "amber",
  urgent: "red"
};

const riskTones: Record<RiskRating, "teal" | "amber" | "red"> = {
  low: "teal",
  medium: "amber",
  high: "red"
};

export function MatterStatusBadge({ status }: { status: string }) {
  const key = status as MatterStatus;
  return (
    <Badge tone={matterTones[key] ?? "neutral"} dot>
      {MATTER_STATUS_LABELS[key] ?? status}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const key = status as TaskStatus;
  return <Badge tone={taskTones[key] ?? "neutral"}>{TASK_STATUS_LABELS[key] ?? status}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const key = priority as TaskPriority;
  return (
    <Badge tone={priorityTones[key] ?? "neutral"}>
      {TASK_PRIORITY_LABELS[key] ?? priority}
    </Badge>
  );
}

export function RiskBadge({ rating }: { rating: string }) {
  const key = rating as RiskRating;
  return (
    <Badge tone={riskTones[key] ?? "neutral"}>
      {RISK_RATING_LABELS[key] ?? rating}
    </Badge>
  );
}
