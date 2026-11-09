const FIRM_TIMEZONE = "Australia/Sydney";

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value.length === 10 ? `${value}T00:00:00` : value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: FIRM_TIMEZONE
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: FIRM_TIMEZONE
  }).format(date);
}

export function formatLongDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: FIRM_TIMEZONE
  }).format(value);
}

export function greeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      hour: "numeric",
      hour12: false,
      timeZone: FIRM_TIMEZONE
    }).format(date)
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

export interface DueLabel {
  label: string;
  tone: "overdue" | "today" | "soon" | "later" | "none";
}

export function dueLabel(dueOn: string | null, todayIso: string): DueLabel {
  if (!dueOn) return { label: "No due date", tone: "none" };

  const due = Date.parse(`${dueOn}T00:00:00Z`);
  const today = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(due) || Number.isNaN(today)) return { label: formatDate(dueOn), tone: "later" };

  const days = Math.round((due - today) / 86_400_000);
  if (days < 0) return { label: `Overdue · ${formatDate(dueOn)}`, tone: "overdue" };
  if (days === 0) return { label: "Due today", tone: "today" };
  if (days === 1) return { label: "Due tomorrow", tone: "soon" };
  if (days <= 7) return { label: `Due in ${days} days`, tone: "soon" };
  return { label: `Due ${formatDate(dueOn)}`, tone: "later" };
}

export function todayIsoDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FIRM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function humaniseAction(action: string): string {
  const [entity, verb] = action.split(".");
  const entityLabel = entity
    ? entity.replace(/_/g, " ").replace(/^\w/, (character) => character.toUpperCase())
    : action;
  if (!verb) return entityLabel;
  const verbLabel = verb.replace(/_/g, " ").replace(/^\w/, (character) => character.toUpperCase());
  return `${entityLabel} — ${verbLabel}`;
}

export function formatRelative(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}
