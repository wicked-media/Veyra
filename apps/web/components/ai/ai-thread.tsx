import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@veyra/ui";
import type { AiWorkspace } from "@veyra/core";
import { AiProposalList } from "./proposal-list";

export function AiThreadView({
  workspace,
  currentUserId,
  canApprove,
  canReject = canApprove,
  returnTo
}: {
  workspace: AiWorkspace;
  currentUserId: string;
  canApprove: boolean;
  canReject?: boolean;
  returnTo: string;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{workspace.thread.title}</CardTitle>
            <p className="mt-0.5 text-[11px] text-faint">
              {workspace.thread.matterNumber} · {workspace.thread.matterTitle}
            </p>
          </div>
          <Badge tone={workspace.configuration.mode === "openai" ? "teal" : "amber"}>
            {workspace.configuration.mode === "openai"
              ? workspace.configuration.model
              : "Local retrieval preview"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {workspace.messages.map((message) => (
            <article
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[85%] rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3"
                  : "max-w-[92%] rounded-xl border border-line bg-canvas/50 px-4 py-3"
              }
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
                {message.role === "user" ? "You" : `Veyra AI${message.provider ? ` · ${message.provider}` : ""}`}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                {message.content}
              </p>
              {message.citations.length > 0 ? (
                <div className="mt-3 border-t border-line pt-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
                    Sources
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {message.citations.map((citation) => (
                      <Link
                        key={`${message.id}-${citation.id}`}
                        href={`/matters/${workspace.thread.matterId}?tab=documents`}
                        className="rounded-full border border-teal-500/25 bg-teal-500/10 px-2.5 py-1 text-[10.5px] text-teal-600 hover:bg-teal-500/15"
                      >
                        [{citation.id}] {citation.documentTitle} · v{citation.versionNumber} · chunk{" "}
                        {citation.ordinal + 1}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          <p className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-[10.5px] leading-relaxed text-warning">
            {workspace.configuration.disclaimer} AI sees only matter chunks your account may read;
            citations must be opened and checked against the source.
          </p>
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Human approval queue</h2>
          <span className="text-[11px] text-faint">No AI action writes itself</span>
        </div>
        <AiProposalList
          proposals={workspace.proposals}
          currentUserId={currentUserId}
          canApprove={canApprove}
          canReject={canReject}
          returnTo={returnTo}
        />
      </div>
    </div>
  );
}
