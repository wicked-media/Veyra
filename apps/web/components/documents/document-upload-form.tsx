import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory
} from "@veyra/contracts";
import { Button, Field, Input, Select, Textarea, controlClassName } from "@veyra/ui";
import { MAX_DOCUMENT_BYTES } from "@veyra/core";

const ACCEPT =
  ".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,application/pdf,text/plain,text/markdown,text/csv,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface DocumentUploadFormProps {
  matterId: string;
  returnTo: string;
  matters?: { id: string; matterNumber: string; title: string }[];
  mode?: "new" | "version";
  document?: {
    id: string;
    title: string;
    description: string | null;
    category: DocumentCategory;
  };
}

export function DocumentUploadForm({
  matterId,
  returnTo,
  matters,
  mode = "new",
  document
}: DocumentUploadFormProps) {
  const isVersion = mode === "version" && document;
  const maxMegabytes = Math.floor(MAX_DOCUMENT_BYTES / (1024 * 1024));

  return (
    <form
      action="/api/documents/upload"
      method="post"
      encType="multipart/form-data"
      className="space-y-4"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {isVersion || !matters ? <input type="hidden" name="matterId" value={matterId} /> : null}
      {isVersion ? (
        <>
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="title" value={document.title} />
          <input type="hidden" name="description" value={document.description ?? ""} />
          <input type="hidden" name="category" value={document.category} />
        </>
      ) : null}

      {matters && !isVersion ? (
        <Field label="Matter" htmlFor="document-matter">
          <Select id="document-matter" name="matterId" defaultValue={matterId} required>
            {matters.map((matter) => (
              <option key={matter.id} value={matter.id}>
                {matter.matterNumber} · {matter.title}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {!isVersion ? (
        <>
          <Field label="Title" htmlFor="document-title">
            <Input
              id="document-title"
              name="title"
              required
              maxLength={240}
              placeholder="e.g. Executed lease — Northshore Plaza"
            />
          </Field>

          <Field label="Category" htmlFor="document-category">
            <Select id="document-category" name="category" defaultValue="general">
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {DOCUMENT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description" htmlFor="document-description" hint="Optional context for the matter team">
            <Textarea
              id="document-description"
              name="description"
              maxLength={2000}
              placeholder="What this document is and why it matters."
            />
          </Field>
        </>
      ) : (
        <div className="rounded-lg border border-line bg-canvas/60 px-3 py-2.5 text-xs text-muted">
          Uploading a new version of <span className="font-medium text-ink">{document.title}</span>.
          The previous version remains immutable in the version history.
        </div>
      )}

      <Field
        label={isVersion ? "New version file" : "File"}
        htmlFor="document-file"
        hint={`PDF, DOCX, text, Markdown, CSV, PNG or JPEG · up to ${maxMegabytes} MB`}
      >
        <input
          id="document-file"
          name="file"
          type="file"
          required
          accept={ACCEPT}
          className={controlClassName + " py-2"}
        />
      </Field>

      <p className="text-[10.5px] leading-relaxed text-faint">
        Documents are never public. Downloads require matter access and are audited. Files are held
        for malware scanning; production requires a configured scanner. Text search is available for
        text-based files; PDF/DOCX OCR is not enabled.
      </p>

      <Button type="submit" size="sm" className="w-full">
        {isVersion ? "Add version" : "Upload document"}
      </Button>
    </form>
  );
}
