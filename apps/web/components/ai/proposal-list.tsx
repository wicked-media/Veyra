import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@veyra/ui";
import type { AiProposalView } from "@veyra/core";
import {
  approveAiProposalAction,
  rejectAiProposalAction
} from "@/lib/actions/ai";

function statusTone(status: AiProposalView["status"]): "amber" | "teal" | "neutral" {
  if (status === "approved") return "teal";
  if (status === "rejected") return "neutral";
  return "amber";
}

export function AiProposalList({
  proposals,
  currentUserId,
  canApprove,
  canReject = canApprove,
  returnTo
}: {
  proposals: AiProposalView[];
  currentUserId: string;
  canApprove: boolean;
  canReject?: boolean;
  returnTo: string;
}) {
  if (proposals.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-muted">
        No AI action proposals. Veyra AI can suggest a follow-up task, but it never creates one
        without a human decision.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((proposal) => {
        const isOwnProposal = proposal.proposedBy === currentUserId;
        return (
          <Card key={proposal.id} className="border-warning/20 bg-warning/[0.03]">
            <CardHeader className="py-3">
              <div className="min-w-0">
                <CardTitle className="text-[13px]">{proposal.payload.title}</CardTitle>
                <p className="mt-0.5 text-[11px] text-faint">
                  {proposal.matterNumber} · proposed by {proposal.proposedByName ?? "Unknown"} ·{" "}
                  {proposal.actionType.replace(/_/g, " ")}
                </p>
              </div>
              <Badge tone={statusTone(proposal.status)} dot>
                {proposal.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 py-3">
              <p className="text-xs leading-relaxed text-muted">{proposal.payload.description}</p>
              {proposal.reviewNote ? (
                <p className="text-[11px] text-faint">
                  Review note: {proposal.reviewNote}
                  {proposal.reviewedByName ? ` · ${proposal.reviewedByName}` : ""}
                </p>
              ) : null}

              {proposal.status === "pending" ? (
                isOwnProposal ? (
                  <p className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-[11px] leading-relaxed text-warning">
                    A different authorised person must approve this proposal. The proposer cannot
                    approve their own AI-suggested action.
                  </p>
                ) : canApprove ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <form action={approveAiProposalAction} className="space-y-2">
                      <input type="hidden" name="proposalId" value={proposal.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <Input name="note" maxLength={1000} placeholder="Optional approval note" className="h-8 text-xs" />
                      <Button type="submit" size="sm" className="w-full">
                        Approve and create task
                      </Button>
                    </form>
                    {canReject ? (
                      <form action={rejectAiProposalAction} className="space-y-2">
                        <input type="hidden" name="proposalId" value={proposal.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <Input name="note" maxLength={1000} placeholder="Optional rejection note" className="h-8 text-xs" />
                        <Button type="submit" variant="secondary" size="sm" className="w-full">
                          Reject
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[11px] text-faint">
                    Your role can view this proposal but cannot approve it.
                  </p>
                )
              ) : null}

              {proposal.status === "approved" && proposal.reviewedByName ? (
                <p className="text-[11px] text-positive">
                  Approved by {proposal.reviewedByName}. The task is now in the matter record.
                </p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
      {canDecideMessage(proposals, currentUserId, canApprove)}
    </div>
  );
}

function canDecideMessage(
  proposals: AiProposalView[],
  currentUserId: string,
  canApprove: boolean
): string | null {
  if (!canApprove) return null;
  const pending = proposals.filter((proposal) => proposal.status === "pending");
  if (pending.length === 0) return null;
  if (pending.some((proposal) => proposal.proposedBy !== currentUserId)) return null;
  return "Every pending proposal was raised by you; a second authorised person must review it.";
}
