import { z } from "zod";
import { ROLES } from "./permissions";

export const roleSchema = z.enum(ROLES);

export const PRACTICE_AREAS = [
  "commercial",
  "estates",
  "litigation",
  "family",
  "conveyancing",
  "criminal",
  "employment",
  "property",
  "other"
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];
export const practiceAreaSchema = z.enum(PRACTICE_AREAS);

export const MATTER_STATUSES = ["open", "on_hold", "closed", "archived"] as const;
export type MatterStatus = (typeof MATTER_STATUSES)[number];
export const matterStatusSchema = z.enum(MATTER_STATUSES);

export const MATTER_ROLES = ["lead", "member", "viewer"] as const;
export type MatterRole = (typeof MATTER_ROLES)[number];
export const matterRoleSchema = z.enum(MATTER_ROLES);

export const PARTY_ROLES = ["client", "opposing", "counsel", "third_party", "related"] as const;
export type PartyRole = (typeof PARTY_ROLES)[number];

export const CLIENT_TYPES = ["individual", "organisation"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export const clientTypeSchema = z.enum(CLIENT_TYPES);

export const CLIENT_STATUSES = ["active", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const RISK_RATINGS = ["low", "medium", "high"] as const;
export type RiskRating = (typeof RISK_RATINGS)[number];
export const riskRatingSchema = z.enum(RISK_RATINGS);

export const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const taskStatusSchema = z.enum(TASK_STATUSES);

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export const DOCUMENT_CATEGORIES = [
  "general",
  "correspondence",
  "court",
  "contract",
  "evidence",
  "advice",
  "template",
  "other"
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

export const DOCUMENT_STATUSES = ["active", "archived"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_SCAN_STATUSES = ["pending", "clean", "infected", "failed"] as const;
export type DocumentScanStatus = (typeof DOCUMENT_SCAN_STATUSES)[number];

export const CALENDAR_EVENT_TYPES = [
  "hearing",
  "court_date",
  "meeting",
  "internal",
  "other"
] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];
export const calendarEventTypeSchema = z.enum(CALENDAR_EVENT_TYPES);

export const DEADLINE_CATEGORIES = [
  "limitation",
  "filing",
  "court",
  "statutory",
  "internal"
] as const;
export type DeadlineCategory = (typeof DEADLINE_CATEGORIES)[number];
export const deadlineCategorySchema = z.enum(DEADLINE_CATEGORIES);

export const DEADLINE_STATUSES = ["open", "met", "missed", "waived"] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];
export const deadlineStatusSchema = z.enum(DEADLINE_STATUSES);

export const DEADLINE_VERIFICATIONS = ["unverified", "verified"] as const;
export type DeadlineVerification = (typeof DEADLINE_VERIFICATIONS)[number];

export const PRACTICE_AREA_LABELS: Record<PracticeArea, string> = {
  commercial: "Commercial",
  estates: "Wills & estates",
  litigation: "Litigation",
  family: "Family",
  conveyancing: "Conveyancing",
  criminal: "Criminal",
  employment: "Employment",
  property: "Property",
  other: "Other"
};

export const MATTER_STATUS_LABELS: Record<MatterStatus, string> = {
  open: "Open",
  on_hold: "On hold",
  closed: "Closed",
  archived: "Archived"
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled"
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent"
};

export const RISK_RATING_LABELS: Record<RiskRating, string> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk"
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  general: "General",
  correspondence: "Correspondence",
  court: "Court",
  contract: "Contract",
  evidence: "Evidence",
  advice: "Advice",
  template: "Template",
  other: "Other"
};

export const DOCUMENT_SCAN_STATUS_LABELS: Record<DocumentScanStatus, string> = {
  pending: "Scan pending",
  clean: "Scan clear",
  infected: "Quarantined",
  failed: "Scan failed"
};

export const CALENDAR_EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  hearing: "Hearing",
  court_date: "Court date",
  meeting: "Meeting",
  internal: "Internal",
  other: "Other"
};

export const DEADLINE_CATEGORY_LABELS: Record<DeadlineCategory, string> = {
  limitation: "Limitation date",
  filing: "Filing deadline",
  court: "Court deadline",
  statutory: "Statutory deadline",
  internal: "Internal deadline"
};

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  open: "Open",
  met: "Met",
  missed: "Missed",
  waived: "Waived"
};

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format");

export const localDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a date and time");

export const uuidSchema = z.uuid("A valid identifier is required");
