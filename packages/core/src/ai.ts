import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  AI_DISCLAIMER,
  AiPolicyError,
  assertAiExecutionAllowed,
  createAiProvider,
  resolveAiConfiguration,
  type AiGenerationInput,
  type AiSource
} from "@veyra/ai";
import { checkRateLimit } from "@veyra/auth";
import type { VeyraDb } from "@veyra/database";
import {
  aiActionProposals,
  aiMessages,
  aiThreads,
  documentChunks,
  documents,
  documentVersions,
  matters,
  tasks,
  users,
  type AiCitation,
  type AiProposedTask
} from "@veyra/database";
import { assertPermission, requireMatterAccess, visibleMatterCondition } from "./access";
import { recordAudit } from "./audit";
import { conflict, forbidden, notFound, rateLimited, validation } from "./errors";
import type { Actor, DbExecutor } from "./types";

const proposerUsers = alias(users, "ai_proposer");
const reviewerUsers = alias(users, "ai_reviewer");

export interface AiThreadSummary {
  id: string;
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: AiCitation[];
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export interface AiProposalView {
  id: string;
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  threadId: string | null;
  messageId: string | null;
  actionType: "create_task";
  status: "pending" | "approved" | "rejected";
  payload: AiProposedTask;
  proposedBy: string | null;
  proposedByName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export interface AiWorkspace {
  thread: AiThreadSummary;
  messages: AiMessageView[];
  proposals: AiProposalView[];
  configuration: {
    mode: "openai" | "local_extractive" | "disabled";
    model: string;
    disclaimer: string;
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function termsFor(question: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "what",
    "when",
    "where",
    "which",
    "how",
    "are",
    "was",
    "were",
    "has",
    "have",
    "does",
    "did",
    "about",
    "into",
    "please",
    "could",
    "would",
    "should"
  ]);
  return [
    ...new Set(
      question
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 3 && !stop.has(term))
    )
  ].slice(0, 8);
}

async function retrieveSources(
  db: DbExecutor,
  actor: Actor,
  matterId: string,
  question: string
): Promise<AiSource[]> {
  const terms = termsFor(question);
  const searchConditions: SQL[] = terms.flatMap((term) => {
    const match = `%${escapeLike(term)}%`;
    const clause = or(ilike(documentChunks.content, match), ilike(documents.title, match));
    return clause ? [clause] : [];
  });

  const conditions = [
    eq(documentChunks.organisationId, actor.organisationId),
    eq(documentChunks.matterId, matterId),
    eq(documents.status, "active"),
    eq(documentVersions.scanStatus, "clean"),
    visibleMatterCondition(actor),
    ...(searchConditions.length > 0 ? [or(...searchConditions) as SQL] : [])
  ];

  const rows = await db
    .select({
      documentId: documents.id,
      documentTitle: documents.title,
      versionNumber: documentVersions.versionNumber,
      ordinal: documentChunks.ordinal,
      content: documentChunks.content
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .innerJoin(documentVersions, eq(documentVersions.id, documentChunks.versionId))
    .innerJoin(matters, eq(matters.id, documentChunks.matterId))
    .where(and(...conditions))
    .orderBy(desc(documentChunks.createdAt))
    .limit(80);

  const scored = rows
    .map((row) => {
      const lower = row.content.toLowerCase();
      const title = row.documentTitle.toLowerCase();
      const score = terms.reduce(
        (sum, term) => sum + (lower.includes(term) ? 1 : 0) + (title.includes(term) ? 1 : 0),
        0
      );
      return { ...row, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected = (scored.some((row) => row.score > 0)
    ? scored.filter((row) => row.score > 0)
    : scored
  ).slice(0, 6);

  return selected.map((row, index) => ({
    id: `D${index + 1}`,
    documentId: row.documentId,
    documentTitle: row.documentTitle,
    versionNumber: row.versionNumber,
    ordinal: row.ordinal,
    content: row.content
  }));
}

export async function listAiThreads(
  db: DbExecutor,
  actor: Actor,
  options: { matterId?: string; limit?: number } = {}
): Promise<AiThreadSummary[]> {
  assertPermission(actor, "ai:use");
  if (options.matterId) {
    await requireMatterAccess(db, actor, options.matterId, "ai:use");
  }

  const conditions = [eq(aiThreads.organisationId, actor.organisationId), visibleMatterCondition(actor)];
  if (options.matterId) conditions.push(eq(aiThreads.matterId, options.matterId));

  const rows = await db
    .select({
      id: aiThreads.id,
      matterId: aiThreads.matterId,
      matterNumber: matters.matterNumber,
      matterTitle: matters.title,
      title: aiThreads.title,
      createdAt: aiThreads.createdAt,
      updatedAt: aiThreads.updatedAt
    })
    .from(aiThreads)
    .innerJoin(matters, eq(matters.id, aiThreads.matterId))
    .where(and(...conditions))
    .orderBy(desc(aiThreads.updatedAt))
    .limit(options.limit ?? 20);

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
}

async function requireThread(
  db: DbExecutor,
  actor: Actor,
  threadId: string
): Promise<AiThreadSummary> {
  assertPermission(actor, "ai:use");
  const rows = await db
    .select({
      id: aiThreads.id,
      matterId: aiThreads.matterId,
      matterNumber: matters.matterNumber,
      matterTitle: matters.title,
      title: aiThreads.title,
      createdAt: aiThreads.createdAt,
      updatedAt: aiThreads.updatedAt
    })
    .from(aiThreads)
    .innerJoin(matters, eq(matters.id, aiThreads.matterId))
    .where(and(eq(aiThreads.id, threadId), eq(aiThreads.organisationId, actor.organisationId)))
    .limit(1);

  const thread = rows[0];
  if (!thread) throw notFound("AI thread not found");
  await requireMatterAccess(db, actor, thread.matterId, "ai:use");
  return {
    ...thread,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString()
  };
}

function proposalView(row: {
  id: string;
  matterId: string;
  matterNumber: string;
  matterTitle: string;
  threadId: string | null;
  messageId: string | null;
  actionType: "create_task";
  status: "pending" | "approved" | "rejected";
  payload: AiProposedTask;
  proposedBy: string | null;
  proposedByName: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
}): AiProposalView {
  return {
    ...row,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString()
  };
}

export async function getAiWorkspace(
  db: DbExecutor,
  actor: Actor,
  threadId: string
): Promise<AiWorkspace> {
  const thread = await requireThread(db, actor, threadId);
  const messages = await db
    .select({
      id: aiMessages.id,
      role: aiMessages.role,
      content: aiMessages.content,
      citations: aiMessages.citations,
      provider: aiMessages.provider,
      model: aiMessages.model,
      createdAt: aiMessages.createdAt
    })
    .from(aiMessages)
    .where(
      and(eq(aiMessages.threadId, thread.id), eq(aiMessages.organisationId, actor.organisationId))
    )
    .orderBy(aiMessages.createdAt);

  const proposalRows = await db
    .select({
      id: aiActionProposals.id,
      matterId: aiActionProposals.matterId,
      matterNumber: matters.matterNumber,
      matterTitle: matters.title,
      threadId: aiActionProposals.threadId,
      messageId: aiActionProposals.messageId,
      actionType: aiActionProposals.actionType,
      status: aiActionProposals.status,
      payload: aiActionProposals.payload,
      proposedBy: aiActionProposals.proposedBy,
      proposedByName: proposerUsers.name,
      reviewedBy: aiActionProposals.reviewedBy,
      reviewedByName: reviewerUsers.name,
      reviewedAt: aiActionProposals.reviewedAt,
      reviewNote: aiActionProposals.reviewNote,
      createdAt: aiActionProposals.createdAt
    })
    .from(aiActionProposals)
    .innerJoin(matters, eq(matters.id, aiActionProposals.matterId))
    .leftJoin(proposerUsers, eq(proposerUsers.id, aiActionProposals.proposedBy))
    .leftJoin(reviewerUsers, eq(reviewerUsers.id, aiActionProposals.reviewedBy))
    .where(
      and(
        eq(aiActionProposals.organisationId, actor.organisationId),
        eq(aiActionProposals.threadId, thread.id),
        visibleMatterCondition(actor)
      )
    )
    .orderBy(desc(aiActionProposals.createdAt));

  const configuration = resolveAiConfiguration();
  return {
    thread,
    messages: messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString()
    })),
    proposals: proposalRows.map(proposalView),
    configuration: {
      mode: configuration.mode,
      model: configuration.model,
      disclaimer: AI_DISCLAIMER
    }
  };
}

export async function listPendingAiProposals(
  db: DbExecutor,
  actor: Actor,
  options: { matterId?: string; limit?: number } = {}
): Promise<AiProposalView[]> {
  assertPermission(actor, "ai:use");
  if (options.matterId) await requireMatterAccess(db, actor, options.matterId, "ai:use");

  const conditions = [
    eq(aiActionProposals.organisationId, actor.organisationId),
    eq(aiActionProposals.status, "pending"),
    visibleMatterCondition(actor)
  ];
  if (options.matterId) conditions.push(eq(aiActionProposals.matterId, options.matterId));

  const rows = await db
    .select({
      id: aiActionProposals.id,
      matterId: aiActionProposals.matterId,
      matterNumber: matters.matterNumber,
      matterTitle: matters.title,
      threadId: aiActionProposals.threadId,
      messageId: aiActionProposals.messageId,
      actionType: aiActionProposals.actionType,
      status: aiActionProposals.status,
      payload: aiActionProposals.payload,
      proposedBy: aiActionProposals.proposedBy,
      proposedByName: proposerUsers.name,
      reviewedBy: aiActionProposals.reviewedBy,
      reviewedByName: reviewerUsers.name,
      reviewedAt: aiActionProposals.reviewedAt,
      reviewNote: aiActionProposals.reviewNote,
      createdAt: aiActionProposals.createdAt
    })
    .from(aiActionProposals)
    .innerJoin(matters, eq(matters.id, aiActionProposals.matterId))
    .leftJoin(proposerUsers, eq(proposerUsers.id, aiActionProposals.proposedBy))
    .leftJoin(reviewerUsers, eq(reviewerUsers.id, aiActionProposals.reviewedBy))
    .where(and(...conditions))
    .orderBy(desc(aiActionProposals.createdAt))
    .limit(options.limit ?? 30);

  return rows.map(proposalView);
}

export interface AskMatterQuestionResult {
  threadId: string;
  messageId: string;
  proposalId: string | null;
}

export async function askMatterQuestion(
  db: VeyraDb,
  actor: Actor,
  input: { matterId: string; threadId?: string | undefined; question: string }
): Promise<AskMatterQuestionResult> {
  assertPermission(actor, "ai:use");
  await requireMatterAccess(db, actor, input.matterId, "ai:use");

  const configuration = resolveAiConfiguration();
  assertAiExecutionAllowed(
    {
      userId: actor.userId,
      organisationId: actor.organisationId,
      permissions: actor.permissions,
      matterId: input.matterId,
      matterAccessGranted: true,
      purpose: "matter document research"
    },
    configuration
  );

  const limit = checkRateLimit(`ai:${actor.userId}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) throw rateLimited("AI requests are limited to 20 per hour. Try again later.");

  let threadId = input.threadId;
  if (threadId) {
    await requireThread(db, actor, threadId);
    const existing = await db
      .select({ matterId: aiThreads.matterId })
      .from(aiThreads)
      .where(and(eq(aiThreads.id, threadId), eq(aiThreads.organisationId, actor.organisationId)))
      .limit(1);
    if (existing[0]?.matterId !== input.matterId) throw notFound("AI thread not found");
  } else {
    const inserted = await db
      .insert(aiThreads)
      .values({
        organisationId: actor.organisationId,
        matterId: input.matterId,
        title: input.question.replace(/\s+/g, " ").slice(0, 120),
        createdBy: actor.userId
      })
      .returning({ id: aiThreads.id });
    threadId = inserted[0]?.id;
    if (!threadId) throw new Error("AI thread insert returned no row");
  }

  await db.insert(aiMessages).values({
    organisationId: actor.organisationId,
    threadId,
    role: "user",
    content: input.question
  });

  const sources = await retrieveSources(db, actor, input.matterId, input.question);
  const provider = createAiProvider(configuration);
  if (!provider) throw validation("AI is not configured");

  let generated;
  try {
    const generationInput: AiGenerationInput = {
      question: input.question,
      sources,
      capability: "document_qa"
    };
    generated = await provider.generate(generationInput);
  } catch (error) {
    if (error instanceof AiPolicyError) throw validation(error.message);
    console.error("[veyra] AI provider failure", error);
    throw validation("The AI request could not be completed or verified. No answer was saved.");
  }

  const citationMap = new Map(sources.map((source) => [source.id, source]));
  const citations: AiCitation[] = generated.citationIds.map((id) => {
    const source = citationMap.get(id);
    if (!source) throw validation("The AI answer contained an unknown citation and was withheld");
    return {
      id: source.id,
      documentId: source.documentId,
      documentTitle: source.documentTitle,
      versionNumber: source.versionNumber,
      ordinal: source.ordinal
    };
  });

  return db.transaction(async (tx) => {
    const messageRows = await tx
      .insert(aiMessages)
      .values({
        organisationId: actor.organisationId,
        threadId,
        role: "assistant",
        content: generated.answer,
        citations,
        provider: provider.name,
        model: provider.model
      })
      .returning({ id: aiMessages.id });
    const messageId = messageRows[0]?.id;
    if (!messageId) throw new Error("AI message insert returned no row");

    let proposalId: string | null = null;
    if (generated.suggestedTask) {
      const proposalRows = await tx
        .insert(aiActionProposals)
        .values({
          organisationId: actor.organisationId,
          matterId: input.matterId,
          threadId,
          messageId,
          actionType: "create_task",
          payload: generated.suggestedTask,
          proposedBy: actor.userId
        })
        .returning({ id: aiActionProposals.id });
      proposalId = proposalRows[0]?.id ?? null;
    }

    await tx
      .update(aiThreads)
      .set({ updatedAt: new Date() })
      .where(and(eq(aiThreads.id, threadId), eq(aiThreads.organisationId, actor.organisationId)));

    await recordAudit(tx, actor, {
      action: "ai.question_answered",
      entityType: "ai_thread",
      entityId: threadId,
      matterId: input.matterId,
      metadata: {
        provider: provider.name,
        model: provider.model,
        status: generated.status,
        sourceCount: sources.length,
        citationCount: citations.length,
        proposalCreated: proposalId !== null
      }
    });

    return { threadId: threadId as string, messageId, proposalId };
  });
}

async function loadProposalForDecision(
  db: DbExecutor,
  actor: Actor,
  proposalId: string
): Promise<{
  id: string;
  matterId: string;
  status: "pending" | "approved" | "rejected";
  payload: AiProposedTask;
  proposedBy: string | null;
}> {
  assertPermission(actor, "ai:use");
  const rows = await db
    .select({
      id: aiActionProposals.id,
      matterId: aiActionProposals.matterId,
      status: aiActionProposals.status,
      payload: aiActionProposals.payload,
      proposedBy: aiActionProposals.proposedBy
    })
    .from(aiActionProposals)
    .where(
      and(
        eq(aiActionProposals.id, proposalId),
        eq(aiActionProposals.organisationId, actor.organisationId)
      )
    )
    .limit(1);
  const proposal = rows[0];
  if (!proposal) throw notFound("AI proposal not found");
  await requireMatterAccess(db, actor, proposal.matterId, "ai:use");
  if (proposal.status !== "pending") throw conflict("This proposal has already been reviewed");
  return proposal;
}

export async function approveAiProposal(
  db: VeyraDb,
  actor: Actor,
  proposalId: string,
  note: string | null
): Promise<{ taskId: string }> {
  assertPermission(actor, "task:create");
  const proposal = await loadProposalForDecision(db, actor, proposalId);
  await requireMatterAccess(db, actor, proposal.matterId, "task:create");

  if (proposal.proposedBy === actor.userId) {
    throw forbidden("A different authorised person must approve an AI-proposed action");
  }
  if (proposal.payload.title.trim().length < 2) {
    throw validation("The proposal does not contain a valid task title");
  }

  return db.transaction(async (tx) => {
    const taskRows = await tx
      .insert(tasks)
      .values({
        organisationId: actor.organisationId,
        matterId: proposal.matterId,
        assigneeUserId: actor.userId,
        title: proposal.payload.title.slice(0, 240),
        description: proposal.payload.description.slice(0, 2000),
        priority: "medium",
        createdBy: actor.userId
      })
      .returning({ id: tasks.id });
    const task = taskRows[0];
    if (!task) throw new Error("Task insert returned no row");

    const updated = await tx
      .update(aiActionProposals)
      .set({
        status: "approved",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        reviewNote: note,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(aiActionProposals.id, proposalId),
          eq(aiActionProposals.organisationId, actor.organisationId),
          eq(aiActionProposals.status, "pending")
        )
      )
      .returning({ id: aiActionProposals.id });
    if (!updated[0]) throw conflict("This proposal has already been reviewed");

    await recordAudit(tx, actor, {
      action: "task.created",
      entityType: "task",
      entityId: task.id,
      matterId: proposal.matterId,
      metadata: { title: proposal.payload.title, source: "ai_approved_proposal" }
    });
    await recordAudit(tx, actor, {
      action: "ai.proposal_approved",
      entityType: "ai_proposal",
      entityId: proposalId,
      matterId: proposal.matterId,
      metadata: { taskId: task.id, reviewNote: note }
    });

    return { taskId: task.id };
  });
}

export async function rejectAiProposal(
  db: VeyraDb,
  actor: Actor,
  proposalId: string,
  note: string | null
): Promise<void> {
  const proposal = await loadProposalForDecision(db, actor, proposalId);
  await requireMatterAccess(db, actor, proposal.matterId, "ai:use");

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(aiActionProposals)
      .set({
        status: "rejected",
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
        reviewNote: note,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(aiActionProposals.id, proposalId),
          eq(aiActionProposals.organisationId, actor.organisationId),
          eq(aiActionProposals.status, "pending")
        )
      )
      .returning({ id: aiActionProposals.id });
    if (!updated[0]) throw conflict("This proposal has already been reviewed");

    await recordAudit(tx, actor, {
      action: "ai.proposal_rejected",
      entityType: "ai_proposal",
      entityId: proposalId,
      matterId: proposal.matterId,
      metadata: { reviewNote: note }
    });
  });
}

/** Summaries used by the AI landing page. */
export async function getAiOverview(
  db: DbExecutor,
  actor: Actor
): Promise<{
  threads: AiThreadSummary[];
  proposals: AiProposalView[];
  configuration: ReturnType<typeof resolveAiConfiguration>;
}> {
  assertPermission(actor, "ai:use");
  return {
    threads: await listAiThreads(db, actor, { limit: 20 }),
    proposals: await listPendingAiProposals(db, actor, { limit: 20 }),
    configuration: resolveAiConfiguration()
  };
}

export const AI_APPROVAL_POLICY = {
  allowSelfApproval: false,
  allowedActionTypes: ["create_task"] as const,
  disclaimer: AI_DISCLAIMER
};

export { forbidden };
