import Link from "next/link";
import { Archive, Download, FileText } from "lucide-react";
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_SCAN_STATUS_LABELS
} from "@veyra/contracts";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@veyra/ui";
import type { DocumentSummary } from "@veyra/core";
import { archiveDocumentAction } from "@/lib/actions/documents";
import { formatDate } from "@/lib/format";
import { DocumentUploadForm } from "./document-upload-form";

function scanTone(status: DocumentSummary["scanStatus"]): "teal" | "amber" | "red" {
  if (status === "clean") return "teal";
  if (status === "infected") return "red";
  return "amber";
}

export function DocumentList({
  documents,
  canManage,
  returnTo,
  showMatter = true
}: {
  documents: DocumentSummary[];
  canManage: boolean;
  returnTo: string;
  showMatter?: boolean;
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-5" aria-hidden />}
        title="No documents yet"
        description="Upload the first document to this matter. Versions are immutable and every download is recorded in the matter audit trail."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document register</CardTitle>
        <span className="text-[11px] text-faint">
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Document</th>
                {showMatter ? <th>Matter</th> : null}
                <th>Category</th>
                <th>Version</th>
                <th>Scan</th>
                <th className="hidden lg:table-cell">Updated</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="min-w-[220px]">
                    <p className="font-medium text-ink">{document.title}</p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {document.filename} ·{" "}
                      {document.sizeBytes < 1024
                        ? `${document.sizeBytes} B`
                        : `${(document.sizeBytes / 1024).toFixed(1)} KB`}
                    </p>
                  </td>
                  {showMatter ? (
                    <td className="min-w-[180px]">
                      <Link
                        href={`/matters/${document.matterId}?tab=documents`}
                        className="text-teal-600 hover:text-teal-500"
                      >
                        {document.matterNumber}
                      </Link>
                      <p className="max-w-[220px] truncate text-[11px] text-faint">
                        {document.matterTitle}
                      </p>
                    </td>
                  ) : null}
                  <td className="text-muted">{DOCUMENT_CATEGORY_LABELS[document.category]}</td>
                  <td>
                    <span className="font-mono text-xs text-ink">v{document.latestVersion}</span>
                    <span className="ml-1 text-[10px] text-faint">
                      · {document.versionCount} version{document.versionCount === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td>
                    <Badge tone={scanTone(document.scanStatus)} dot>
                      {DOCUMENT_SCAN_STATUS_LABELS[document.scanStatus]}
                    </Badge>
                  </td>
                  <td className="hidden text-muted lg:table-cell">{formatDate(document.updatedAt)}</td>
                  <td>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {document.scanStatus === "clean" ? (
                        <a
                          href={`/api/documents/${document.latestVersionId}/download`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-ink hover:bg-canvas"
                        >
                          <Download className="size-3.5" aria-hidden />
                          Download
                        </a>
                      ) : (
                        <span className="text-[10px] text-warning">Quarantined</span>
                      )}
                      {document.status === "active" ? (
                        <details className="relative">
                          <summary className="cursor-pointer list-none rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted hover:bg-canvas hover:text-ink">
                            New version
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-line bg-surface p-4 text-left shadow-xl">
                            <DocumentUploadForm
                              matterId={document.matterId}
                              returnTo={returnTo}
                              mode="version"
                              document={{
                                id: document.id,
                                title: document.title,
                                description: document.description,
                                category: document.category
                              }}
                            />
                          </div>
                        </details>
                      ) : null}
                      {canManage && document.status === "active" ? (
                        <form action={archiveDocumentAction}>
                          <input type="hidden" name="documentId" value={document.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted hover:bg-canvas hover:text-danger"
                          >
                            <Archive className="size-3.5" aria-hidden />
                            Archive
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
