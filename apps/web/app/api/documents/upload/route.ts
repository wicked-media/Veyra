import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@veyra/api";
import { safeReturnTo } from "@veyra/auth";
import { documentMetadataSchema } from "@veyra/contracts";
import {
  isAppError,
  MAX_DOCUMENT_BYTES,
  uploadDocument
} from "@veyra/core";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getDocumentScanner, getDocumentStorage } from "@/lib/document-storage";
import { formString } from "@/lib/action-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(request: NextRequest, returnTo: string, message: string): NextResponse {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<Response> {
  assertSameOrigin(request, request.nextUrl.origin);

  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.nextUrl.origin), 303);
  }
  if (session.mustChangePassword) {
    return NextResponse.redirect(new URL("/account/password", request.nextUrl.origin), 303);
  }

  const form = await request.formData();
  const returnTo = safeReturnTo(formString(form, "returnTo"));
  const parsed = documentMetadataSchema.safeParse({
    matterId: formString(form, "matterId"),
    documentId: formString(form, "documentId"),
    title: formString(form, "title"),
    description: formString(form, "description"),
    category: formString(form, "category") || "general"
  });
  if (!parsed.success) {
    return redirectWithError(request, returnTo, "Check the document title, matter and category.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return redirectWithError(request, returnTo, "Choose a file to upload.");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return redirectWithError(request, returnTo, "Documents must be 20 MB or smaller.");
  }

  try {
    await uploadDocument(
      await getDb(),
      session.actor,
      {
        matterId: parsed.data.matterId,
        documentId: parsed.data.documentId || undefined,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        bytes: Buffer.from(await file.arrayBuffer()),
        filename: file.name,
        mimeType: file.type
      },
      getDocumentStorage(),
      getDocumentScanner()
    );
    revalidatePath("/documents");
    revalidatePath(`/matters/${parsed.data.matterId}`);
    const url = new URL(returnTo, request.nextUrl.origin);
    url.searchParams.set("uploaded", "1");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    if (isAppError(error)) {
      return redirectWithError(request, returnTo, error.message);
    }
    console.error("[veyra] document upload failed", error);
    return redirectWithError(request, returnTo, "The document could not be saved. Try again.");
  }
}
