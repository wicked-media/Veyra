import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UserRound } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@veyra/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Select
} from "@veyra/ui";
import { listMembers } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { formatDate, formatRelative } from "@/lib/format";
import { AccessDenied } from "@/components/access-denied";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import { updateMemberRoleAction } from "@/lib/actions/org";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("user:read")) notFound();

  const members = await listMembers(await getDb(), session.actor);
  const canManage = session.actor.permissions.includes("user:manage");
  const isOwner = session.actor.role === "owner";
  const assignableRoles: Role[] = isOwner
    ? [...ROLES]
    : ROLES.filter((role) => role !== "owner" && role !== "admin");

  const query = await searchParams;

  if (!canManage) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Members" description="Your firm's people and their access." />
        <AccessDenied description="User management is restricted to firm owners and administrators. You can still see the team below." />
        <Card className="overflow-hidden">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th className="hidden md:table-cell">Title</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.membershipId}>
                  <td>
                    <p className="text-[12.5px] font-medium text-ink">{member.name}</p>
                    <p className="text-[11px] text-faint">{member.email}</p>
                  </td>
                  <td>
                    <Badge>{ROLE_LABELS[member.role]}</Badge>
                  </td>
                  <td className="hidden text-muted md:table-cell">{member.title ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Members"
        description="Invite people, assign role bundles and review who can access the firm."
      />

      {query.error ? (
        <div role="alert" className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
          {query.error}
        </div>
      ) : null}
      {query.updated ? (
        <div role="status" className="rounded-lg border border-positive/25 bg-positive/10 px-3.5 py-2.5 text-xs text-positive">
          Member role updated.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Firm members</CardTitle>
            <span className="text-[11px] text-faint">{members.length} people</span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th className="hidden lg:table-cell">Last sign-in</th>
                  <th className="hidden md:table-cell">Joined</th>
                  <th className="text-right">Change role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const canEdit =
                    member.userId !== session.actor.userId &&
                    (isOwner || (member.role !== "owner" && member.role !== "admin"));
                  return (
                    <tr key={member.membershipId}>
                      <td>
                        <p className="text-[12.5px] font-medium text-ink">
                          {member.name}
                          {member.userId === session.actor.userId ? (
                            <span className="ml-1.5 text-[9.5px] uppercase tracking-wider text-faint">You</span>
                          ) : null}
                        </p>
                        <p className="text-[11px] text-faint">{member.email}</p>
                        {member.title ? <p className="text-[10.5px] text-muted">{member.title}</p> : null}
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <Badge tone={member.role === "owner" ? "teal" : "neutral"}>
                            {ROLE_LABELS[member.role]}
                          </Badge>
                          {member.status !== "active" ? <Badge tone="amber">{member.status}</Badge> : null}
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap text-[11px] text-muted lg:table-cell">
                        {member.lastLoginAt ? formatRelative(member.lastLoginAt) : "Never"}
                      </td>
                      <td className="hidden whitespace-nowrap text-[11px] text-muted md:table-cell">
                        {formatDate(member.joinedAt)}
                      </td>
                      <td className="text-right">
                        {canEdit ? (
                          <form action={updateMemberRoleAction} className="flex items-center justify-end gap-2">
                            <input type="hidden" name="membershipId" value={member.membershipId} />
                            <label className="sr-only" htmlFor={`role-${member.membershipId}`}>
                              Role for {member.name}
                            </label>
                            <Select
                              id={`role-${member.membershipId}`}
                              name="role"
                              defaultValue={member.role}
                              className="h-8 w-36 text-[11px]"
                            >
                              {(assignableRoles.includes(member.role)
                                ? assignableRoles
                                : [...assignableRoles, member.role]
                              ).map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </Select>
                            <Button type="submit" size="sm" variant="secondary">
                              Save
                            </Button>
                          </form>
                        ) : (
                          <span className="text-[10.5px] text-faint">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Add a member</CardTitle>
            </CardHeader>
            <CardContent>
              <InviteMemberForm canAssignPrivilegedRoles={isOwner} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How invitations work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-[11.5px] leading-relaxed text-muted">
              <p className="flex items-start gap-2">
                <UserRound className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                New accounts receive a one-time temporary password and must replace it at first sign-in.
              </p>
              <p>
                Email delivery is not connected in this build. Share the temporary password securely
                and never send it through an unsecured channel.
              </p>
              <p>
                If the person already has a Veyra account at another firm, adding them here creates a
                separate membership. They can switch firms after signing in.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
