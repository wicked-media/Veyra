import type { Metadata } from "next";
import { FolderClosed, Search } from "lucide-react";
import { AccessDenied } from "@/components/access-denied";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { LinkButton } from "@/components/link-button";
import { getDb } from "@/lib/db";
import { requireAppSession } from "@/lib/session";
import { listDocuments, listMatters } from "@veyra/core";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  PageHeader
} from "@veyra/ui";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; error?: string; uploaded?: string }>;
}) {
  const session = await requireAppSession();
  if (!session.actor.permissions.includes("document:read")) {
    return <AccessDenied description="Document access is not included in your role." />;
  }

  const query = await searchParams;
  const search = query.q?.trim() ?? "";
  const db = await getDb();
  const [documents, matters] = await Promise.all([
    listDocuments(db, session.actor, { q: search || undefined, status: "all", limit: 100 }),
    listMatters(db, session.actor, { status: "all", limit: 100 })
  ]);

  const canUpload = session.actor.permissions.includes("document:upload");
  const canManage = session.actor.permissions.includes("document:manage");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Practice intelligence"
        title="Documents"
        description="Private, versioned documents that inherit matter access and ethical walls. Every download is recorded."
        actions={
          <>
            <LinkButton href="/calendar" size="sm">
              Calendar
            </LinkButton>
            <LinkButton href="/matters" size="sm">
              Matters
            </LinkButton>
          </>
        }
      />

      {query.error ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs leading-relaxed text-danger"
        >
          {query.error}
        </div>
      ) : null}
      {query.uploaded ? (
        <div
          role="status"
          className="rounded-lg border border-positive/25 bg-positive/10 px-3.5 py-2.5 text-xs text-positive"
        >
          Document saved. It is available to everyone with access to the matter.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="space-y-4">
          <form method="get" className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={search}
                placeholder="Search titles and extracted text…"
                aria-label="Search documents"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {search ? (
              <LinkButton href="/documents" variant="ghost" size="md">
                Clear
              </LinkButton>
            ) : null}
          </form>

          <DocumentList
            documents={documents}
            canManage={canManage}
            returnTo="/documents"
            showMatter
          />
        </div>

        {canUpload ? (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Upload a document</CardTitle>
              <FolderClosed className="size-4 text-teal-600" aria-hidden />
            </CardHeader>
            <CardContent>
              {matters.length > 0 ? (
                <DocumentUploadForm
                  matterId={matters[0]?.id ?? ""}
                  matters={matters.map((matter) => ({
                    id: matter.id,
                    matterNumber: matter.matterNumber,
                    title: matter.title
                  }))}
                  returnTo="/documents"
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted">
                  No matters are visible to you yet. Open a matter before uploading a document.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Read-only document access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted">
                Your role can read and download documents but cannot upload, version or archive
                them.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
