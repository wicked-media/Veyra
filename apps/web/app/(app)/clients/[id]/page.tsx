import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone, Users } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader
} from "@veyra/ui";
import { getClientWorkspace, isAppError } from "@veyra/core";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { formatDate, formatRelative, humaniseAction } from "@/lib/format";
import { LinkButton } from "@/components/link-button";
import { MatterStatusBadge, RiskBadge } from "@/components/status-badge";
import { ClientEditForm } from "@/components/forms/client-edit-form";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAppSession();
  const { id } = await params;

  const workspace = await getClientWorkspace(await getDb(), session.actor, id).catch(
    (error: unknown) => {
      if (isAppError(error) && error.code === "NOT_FOUND") notFound();
      throw error;
    }
  );

  const { client, matters, contacts, addresses, activity } = workspace;
  const canUpdate = session.actor.permissions.includes("client:update");
  const canArchive = session.actor.permissions.includes("client:archive");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Client record"
        title={client.displayName}
        description={[
          client.type === "organisation" ? "Organisation" : "Individual",
          client.status === "archived" ? "Archived" : "Active"
        ].join(" · ")}
        actions={
          <>
            <RiskBadge rating={client.riskRating} />
            <LinkButton href="/clients" size="sm">
              Back to clients
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Related matters</CardTitle>
              <span className="text-[11px] text-faint">{matters.length} visible</span>
            </CardHeader>
            {matters.length === 0 ? (
              <CardContent>
                <p className="text-sm text-muted">
                  No matters are visible to you for this client. Restricted matters only appear to
                  their team.
                </p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-shell">
                  <thead>
                    <tr>
                      <th>Matter</th>
                      <th className="hidden md:table-cell">Responsible</th>
                      <th>Status</th>
                      <th className="hidden sm:table-cell">Opened</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matters.map((matter) => (
                      <tr key={matter.id}>
                        <td>
                          <Link href={`/matters/${matter.id}`} className="group block">
                            <span className="block font-mono text-[10px] uppercase tracking-wider text-faint">
                              {matter.matterNumber}
                            </span>
                            <span className="block text-[12.5px] font-medium text-ink group-hover:text-teal-600">
                              {matter.title}
                            </span>
                          </Link>
                        </td>
                        <td className="hidden text-muted md:table-cell">{matter.responsibleName}</td>
                        <td>
                          <MatterStatusBadge status={matter.status} />
                        </td>
                        <td className="hidden whitespace-nowrap text-muted sm:table-cell">
                          {formatDate(matter.openedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contacts and addresses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Contacts
                </p>
                {contacts.length === 0 ? (
                  <p className="text-xs text-muted">No additional contacts recorded.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {contacts.map((contact) => (
                      <li key={contact.id} className="rounded-lg border border-line px-3 py-2">
                        <p className="text-[12.5px] font-medium text-ink">
                          {contact.name}
                          {contact.isPrimary ? (
                            <span className="ml-2 text-[9px] uppercase tracking-wider text-teal-600">Primary</span>
                          ) : null}
                        </p>
                        {contact.title ? <p className="text-[11px] text-faint">{contact.title}</p> : null}
                        {contact.email ? (
                          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                            <Mail className="size-3" aria-hidden /> {contact.email}
                          </p>
                        ) : null}
                        {contact.phone ? (
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                            <Phone className="size-3" aria-hidden /> {contact.phone}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  Addresses
                </p>
                {addresses.length === 0 ? (
                  <p className="text-xs text-muted">No addresses recorded.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {addresses.map((address) => (
                      <li key={address.id} className="rounded-lg border border-line px-3 py-2 text-[11.5px] text-muted">
                        <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                          <MapPin className="size-3" aria-hidden /> {address.label}
                        </p>
                        <p className="mt-1">
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ""}
                        </p>
                        <p>
                          {[address.suburb, address.state, address.postcode].filter(Boolean).join(" ")}
                        </p>
                        <p>{address.country}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.length === 0 ? (
                <p className="text-sm text-muted">No client-level activity recorded yet.</p>
              ) : (
                <ol className="space-y-3.5">
                  {activity.map((event) => (
                    <li key={event.id} className="flex gap-3">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal-500" aria-hidden />
                      <div>
                        <p className="text-[12.5px] font-medium text-ink">{humaniseAction(event.action)}</p>
                        <p className="text-[11px] text-faint">
                          {event.actorName ?? "System"} · {formatRelative(event.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Client details</CardTitle>
              <Badge tone={client.status === "archived" ? "slate" : "teal"}>
                {client.status === "archived" ? "Archived" : "Active"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {[
                ["Email", client.email ?? "—"],
                ["Phone", client.phone ?? "—"],
                ["ABN", client.abn ?? "—"],
                ["Referral source", client.source ?? "—"],
                ["Created", formatDate(client.createdAt)]
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted">{label}</span>
                  <span className="max-w-52 truncate text-right font-medium text-ink">{value}</span>
                </div>
              ))}
              {client.notes ? (
                <div className="rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted">
                  {client.notes}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {canUpdate ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit client</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientEditForm
                  client={{
                    id: client.id,
                    displayName: client.displayName,
                    email: client.email,
                    phone: client.phone,
                    riskRating: client.riskRating,
                    status: client.status,
                    notes: client.notes
                  }}
                  canArchive={canArchive}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-start gap-2.5 pt-4 text-xs text-muted">
                <Users className="mt-0.5 size-3.5 shrink-0 text-teal-600" aria-hidden />
                Your role can view this client but not edit it.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
