import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { AccessDenied } from "@/components/access-denied";
import { AiProposalList } from "@/components/ai/proposal-list";
import { AiThreadView } from "@/components/ai/ai-thread";
import { LinkButton } from "@/components/link-button";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import {
  getAiOverview,
  getAiWorkspace,
  isAppError,
  listMatters,
  type AiWorkspace
} from "@veyra/core";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
  Textarea
} from "@veyra/ui";
import { askAiAction } from "@/lib/actions/ai";

export const metadata: Metadata = { title: "AI assistant" };

export default async function AiPage({
  searchParams
}: {
  searchParams: Promise<{ thread?: string; matter?: string; error?: string }>;
}) {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("ai:use")) {
    return <AccessDenied description="AI assistance is not included in your role." />;
  }

  const query = await searchParams;
  const db = await getDb();
  const overview = await getAiOverview(db, session.actor);
  const canApprove = session.actor.permissions.includes("task:create");
  const canReject = session.actor.permissions.includes("ai:use");

  let workspace: AiWorkspace | null = null;
  let threadError: string | null = null;
  if (query.thread) {
    try {
      workspace = await getAiWorkspace(db, session.actor, query.thread);
    } catch (error) {
      if (isAppError(error)) threadError = error.message;
      else throw error;
    }
  }

  const matters = workspace
    ? []
    : await listMatters(db, session.actor, { status: "open", limit: 100 });
  const mode = overview.configuration.mode;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice intelligence"
        title="AI assistant"
        description="Matter-scoped retrieval with citations from documents your account can read. AI suggests; a human decides."
        actions={
          <>
            <LinkButton href="/documents" variant="secondary" size="sm">
              Documents
            </LinkButton>
            <LinkButton href="/calendar" variant="secondary" size="sm">
              Calendar
            </LinkButton>
          </>
        }
      />

      {query.error || threadError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs leading-relaxed text-danger"
        >
          {query.error ?? threadError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-3 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-600">
            {mode === "openai"
              ? `Provider: ${overview.configuration.model}`
              : mode === "local_extractive"
                ? "Local retrieval preview"
                : "AI is not configured"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            {mode === "local_extractive"
              ? "This development environment uses an extractive local provider: it quotes retrieved matter text and cannot invent citations. It is not a general-purpose model. Configure OPENAI_API_KEY for production answers."
              : mode === "disabled"
                ? "AI is disabled because no production provider is configured. No document text leaves the firm. Configure OPENAI_API_KEY on the server to enable controlled matter Q&A."
                : "Answers are generated from retrieved matter documents only. Citations are validated server-side against the exact retrieved chunks."}
          </p>
        </div>
      </div>

      {workspace ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href="/ai" className="text-xs font-medium text-teal-600 hover:text-teal-500">
              ← All AI threads
            </Link>
            <BadgeLine label="Human approval required" />
          </div>

          <AiThreadView
            workspace={workspace}
            currentUserId={session.actor.userId}
            canApprove={canApprove}
            canReject={canReject}
            returnTo={`/ai?thread=${workspace.thread.id}`}
          />

          <Card>
            <CardHeader>
              <CardTitle>Continue this thread</CardTitle>
              <MessageSquare className="size-4 text-teal-600" aria-hidden />
            </CardHeader>
            <CardContent>
              <form action={askAiAction} className="space-y-3">
                <input type="hidden" name="matterId" value={workspace.thread.matterId} />
                <input type="hidden" name="threadId" value={workspace.thread.id} />
                <input type="hidden" name="returnTo" value={`/ai?thread=${workspace.thread.id}`} />
                <label htmlFor="ai-follow-up" className="sr-only">
                  Follow-up question
                </label>
                <Textarea
                  id="ai-follow-up"
                  name="question"
                  required
                  minLength={4}
                  maxLength={2000}
                  placeholder="Ask a follow-up about this matter…"
                />
                <Button type="submit" size="sm">
                  Ask follow-up
                  <ArrowRight className="size-3.5" aria-hidden />
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Recent threads</CardTitle>
                <span className="text-[11px] text-faint">{overview.threads.length} conversations</span>
              </CardHeader>
              <CardContent>
                {overview.threads.length === 0 ? (
                  <EmptyState
                    icon={<Sparkles className="size-5" aria-hidden />}
                    title="No AI threads yet"
                    description="Ask a question about a matter. Veyra retrieves only documents your account is allowed to read and cites each source."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {overview.threads.map((thread) => (
                      <Link
                        key={thread.id}
                        href={`/ai?thread=${thread.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-teal-500/40 hover:bg-canvas/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink">{thread.title}</p>
                          <p className="mt-0.5 text-[11px] text-faint">
                            {thread.matterNumber} · {thread.matterTitle}
                          </p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">Pending action proposals</h2>
                <span className="text-[11px] text-faint">Second-person approval</span>
              </div>
              <AiProposalList
                proposals={overview.proposals}
                currentUserId={session.actor.userId}
                canApprove={canApprove}
                canReject={canReject}
                returnTo="/ai"
              />
            </div>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Ask a matter question</CardTitle>
              <Sparkles className="size-4 text-teal-600" aria-hidden />
            </CardHeader>
            <CardContent>
              {mode === "disabled" ? (
                <p className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-xs leading-relaxed text-warning">
                  No AI provider is configured, so questions cannot be sent. The firm administrator
                  must configure a server-side provider key.
                </p>
              ) : (
                <form action={askAiAction} className="space-y-4">
                  <input type="hidden" name="returnTo" value="/ai" />
                  <div>
                    <label htmlFor="ai-matter" className="mb-1.5 block text-xs font-semibold text-muted">
                      Matter
                    </label>
                    <Select
                      id="ai-matter"
                      name="matterId"
                      required
                      defaultValue={query.matter ?? ""}
                    >
                      <option value="" disabled>
                        Select a matter
                      </option>
                      {matters.map((matter) => (
                        <option key={matter.id} value={matter.id}>
                          {matter.matterNumber} · {matter.title}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="ai-question" className="mb-1.5 block text-xs font-semibold text-muted">
                      Question
                    </label>
                    <Textarea
                      id="ai-question"
                      name="question"
                      required
                      minLength={4}
                      maxLength={2000}
                      placeholder="What does the executed lease say about the option term?"
                    />
                  </div>
                  <Button type="submit" size="sm" className="w-full" disabled={matters.length === 0}>
                    Ask Veyra AI
                  </Button>
                  <p className="text-[10.5px] leading-relaxed text-faint">
                    Questions and answers are saved to the matter audit trail. AI cannot file, send,
                    move money or change matter access.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function BadgeLine({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-warning">
      <ShieldCheck className="size-3" aria-hidden />
      {label}
    </span>
  );
}

