import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import {
  PERMISSION_GROUPS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type Role
} from "@veyra/contracts";
import { hasPermission } from "@veyra/auth";
import { Card, CardContent, PageHeader } from "@veyra/ui";
import { requireAppSession } from "@/lib/session";
import { AccessDenied } from "@/components/access-denied";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const session = await requireAppSession();
  const allowed =
    session.actor.permissions.includes("user:manage") ||
    session.actor.permissions.includes("org:manage");

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Administration" title="Roles & permissions" />
        <AccessDenied description="The detailed permission matrix is visible to firm owners and administrators only." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Roles & permissions"
        description="These are the server-enforced defaults. Matter restrictions and ethical walls always apply on top, and can only reduce access."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ROLES.map((role) => (
          <Card key={role}>
            <CardContent className="pt-4">
              <p className="text-[12.5px] font-semibold text-ink">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{ROLE_DESCRIPTIONS[role]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-shell min-w-[860px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <>
                  <tr key={`group-${group.key}`} className="bg-canvas/60">
                    <td
                      colSpan={ROLES.length + 1}
                      className="sticky left-0 z-10 bg-canvas/90 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {group.permissions.map((permission) => (
                    <tr key={permission.key}>
                      <td className="sticky left-0 z-10 bg-surface">
                        <p className="text-[12px] text-ink">{permission.label}</p>
                        <p className="font-mono text-[9.5px] text-faint">{permission.key}</p>
                      </td>
                      {ROLES.map((role: Role) => {
                        const granted = hasPermission(role, permission.key);
                        return (
                          <td key={`${role}-${permission.key}`} className="text-center">
                            {granted ? (
                              <span className="inline-grid size-5 place-items-center rounded-full bg-teal-500/10 text-teal-600">
                                <Check className="size-3" aria-label="Granted" />
                              </span>
                            ) : (
                              <span className="inline-grid size-5 place-items-center text-faint">
                                <Minus className="size-3" aria-label="Not granted" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardContent className="space-y-2 text-[11.5px] leading-relaxed text-muted">
          <p>
            Roles are firm-level defaults. A matter marked restricted is visible only to its explicit
            team, even if the role would otherwise allow access. An ethical wall denies access to a
            listed user regardless of team membership.
          </p>
          <p>
            The source of truth is <span className="font-mono text-[10.5px]">packages/contracts/src/permissions.ts</span>{" "}
            and <span className="font-mono text-[10.5px]">packages/auth/src/permissions.ts</span>; this page renders
            those definitions directly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
