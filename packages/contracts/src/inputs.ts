import { z } from "zod";
import { roleSchema } from "./domain";
import {
  calendarEventTypeSchema,
  deadlineCategorySchema,
  deadlineStatusSchema,
  documentCategorySchema,
  isoDateSchema,
  localDateTimeSchema,
  practiceAreaSchema,
  taskPrioritySchema,
  taskStatusSchema,
  uuidSchema
} from "./domain";

/* Authentication ---------------------------------------------------------- */

export const signInSchema = z.object({
  email: z.email("Enter a valid email address").max(320).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, "Enter your password").max(256)
});
export type SignInInput = z.infer<typeof signInSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(256),
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(256)
      .refine((value) => /[a-zA-Z]/.test(value) && /\d/.test(value), {
        message: "Include at least one letter and one number"
      }),
    confirmPassword: z.string().min(1, "Confirm your new password")
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

/* Clients ---------------------------------------------------------------- */

const optionalEmail = z
  .union([z.email("Enter a valid email address").max(320), z.literal("")])
  .optional()
  .transform((value) => (value ? value.trim().toLowerCase() : null));

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null));

export const createClientSchema = z.object({
  type: z.enum(["individual", "organisation"]),
  displayName: z.string().trim().min(2, "Enter a name").max(200),
  firstName: optionalText(120),
  lastName: optionalText(120),
  organisationName: optionalText(200),
  email: optionalEmail,
  phone: optionalText(40),
  abn: optionalText(20),
  riskRating: z.enum(["low", "medium", "high"]).default("low"),
  source: optionalText(120),
  notes: optionalText(4000)
});
export type CreateClientInput = z.input<typeof createClientSchema>;
export type CreateClientData = z.output<typeof createClientSchema>;

export const listClientsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const updateClientSchema = z
  .object({
    displayName: z.string().trim().min(2).max(200).optional(),
    email: optionalEmail,
    phone: optionalText(40),
    riskRating: z.enum(["low", "medium", "high"]).optional(),
    notes: optionalText(4000),
    status: z.enum(["active", "archived"]).optional()
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "No changes supplied"
  });

/* Matters ---------------------------------------------------------------- */

export const createMatterSchema = z.object({
  clientId: uuidSchema,
  title: z.string().trim().min(3, "Enter a matter title").max(240),
  description: optionalText(4000),
  practiceArea: practiceAreaSchema,
  matterType: optionalText(120),
  stage: optionalText(120),
  responsibleUserId: uuidSchema,
  restricted: z.boolean().default(false)
});
export type CreateMatterData = z.output<typeof createMatterSchema>;

export const updateMatterSchema = z
  .object({
    title: z.string().trim().min(3).max(240).optional(),
    description: optionalText(4000),
    stage: optionalText(120),
    status: z.enum(["open", "on_hold", "closed", "archived"]).optional(),
    restricted: z.boolean().optional(),
    responsibleUserId: uuidSchema.optional()
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "No changes supplied"
  });
export type UpdateMatterData = z.output<typeof updateMatterSchema>;

export const listMattersQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["open", "on_hold", "closed", "archived", "all"]).default("all"),
  practiceArea: practiceAreaSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

/* Documents -------------------------------------------------------------- */

export const documentMetadataSchema = z.object({
  matterId: uuidSchema,
  documentId: z.union([uuidSchema, z.literal("")]).optional(),
  title: z.string().trim().min(2, "Enter a document title").max(240),
  description: optionalText(2000),
  category: documentCategorySchema.default("general")
});
export type DocumentMetadataData = z.output<typeof documentMetadataSchema>;

export const archiveDocumentSchema = z.object({ documentId: uuidSchema });

/* Calendar and deadlines ------------------------------------------------- */

export const createCalendarEventSchema = z
  .object({
    matterId: z.union([uuidSchema, z.literal("")]).optional(),
    title: z.string().trim().min(2, "Enter an event title").max(240),
    description: optionalText(2000),
    eventType: calendarEventTypeSchema.default("other"),
    startsAt: localDateTimeSchema,
    endsAt: z.union([localDateTimeSchema, z.literal("")]).optional(),
    location: optionalText(200),
    assignedUserId: z.union([uuidSchema, z.literal("")]).optional()
  })
  .refine((value) => !value.endsAt || value.endsAt > value.startsAt, {
    message: "The end time must be after the start time",
    path: ["endsAt"]
  });
export type CreateCalendarEventData = z.output<typeof createCalendarEventSchema>;

export const createDeadlineSchema = z.object({
  matterId: uuidSchema,
  title: z.string().trim().min(2, "Enter a deadline title").max(240),
  category: deadlineCategorySchema.default("internal"),
  dueOn: isoDateSchema,
  notes: optionalText(2000)
});
export type CreateDeadlineData = z.output<typeof createDeadlineSchema>;

export const updateDeadlineStatusSchema = z.object({
  deadlineId: uuidSchema,
  status: deadlineStatusSchema
});

export const verifyDeadlineSchema = z.object({ deadlineId: uuidSchema });

/* AI --------------------------------------------------------------------- */

export const askAiSchema = z.object({
  matterId: uuidSchema,
  threadId: z.union([uuidSchema, z.literal("")]).optional(),
  question: z.string().trim().min(4, "Ask a question").max(2000)
});
export type AskAiData = z.output<typeof askAiSchema>;

export const aiProposalDecisionSchema = z.object({
  proposalId: uuidSchema,
  note: optionalText(1000)
});

/* Tasks ------------------------------------------------------------------ */

export const createTaskSchema = z.object({
  title: z.string().trim().min(2, "Enter a task title").max(240),
  description: optionalText(2000),
  matterId: uuidSchema.optional(),
  assigneeUserId: uuidSchema.optional(),
  priority: taskPrioritySchema.default("medium"),
  dueOn: z.union([isoDateSchema, z.literal("")]).optional().transform((value) => value || null)
});
export type CreateTaskData = z.output<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assigneeUserId: uuidSchema.nullable().optional(),
    dueOn: z.union([isoDateSchema, z.literal("")]).nullable().optional()
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: "No changes supplied"
  });

export const listTasksQuerySchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "cancelled", "open", "all"]).default("open"),
  mine: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((value) => value === true || value === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

/* Organisation ----------------------------------------------------------- */

export const inviteMemberSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name").max(120),
  email: z.email("Enter a valid email address").max(320).transform((value) => value.trim().toLowerCase()),
  role: roleSchema,
  title: optionalText(120)
});
export type InviteMemberData = z.output<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  membershipId: uuidSchema,
  role: roleSchema
});

export const updateOrgSettingsSchema = z.object({
  name: z.string().trim().min(2, "Enter the firm name").max(160),
  matterNumberPrefix: z
    .string()
    .trim()
    .min(2, "Use at least two characters")
    .max(8)
    .regex(/^[A-Z0-9]+$/, "Use uppercase letters and numbers only"),
  timezone: z.string().trim().min(1).max(60),
  financialYearStartMonth: z.coerce.number().int().min(1).max(12)
});

/* Search ----------------------------------------------------------------- */

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search for at least two characters").max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8)
});
