import { z } from "zod";
import { AppError, forbidden, isAppError, validation } from "@veyra/core";

const MAX_BODY_BYTES = 256 * 1024;

export function jsonResponse(data: unknown, status = 200, requestId?: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  if (requestId) headers.set("x-request-id", requestId);

  return new Response(JSON.stringify({ data }), { status, headers });
}

export function jsonError(error: AppError, requestId: string): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-request-id": requestId
  });

  return new Response(
    JSON.stringify({
      error: {
        code: error.code,
        message: error.message,
        requestId,
        ...(error.details !== undefined ? { details: error.details } : {})
      }
    }),
    { status: error.status, headers }
  );
}

export function toErrorResponse(error: unknown, requestId: string): Response {
  if (isAppError(error)) return jsonError(error, requestId);
  console.error(`[veyra-api:${requestId}]`, error);
  return jsonError(new AppError("INTERNAL", "Something went wrong. Please try again.", 500), requestId);
}

export async function parseBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    throw validation("The submitted body is too large");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw validation("Send a valid JSON body");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw validation(
      "Check the submitted values",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    );
  }
  return parsed.data;
}

export function parseQuery<T extends z.ZodType>(url: URL, schema: T): z.output<T> {
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) raw[key] = value;

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw validation(
      "Check the query parameters",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    );
  }
  return parsed.data;
}

/**
 * Cookie-authenticated mutations must originate from the application's own
 * origin. Requests without an Origin header (server-to-server/CLI) are allowed
 * because they cannot carry a browser's ambient cookie on a cross-site request;
 * SameSite=Lax provides the complementary control.
 */
export function assertSameOrigin(request: Request, appUrl: string): void {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.get("origin");
  if (!origin) return;

  let expected: string;
  try {
    expected = new URL(appUrl).origin;
  } catch {
    throw forbidden("The application origin is not configured");
  }

  if (origin !== expected) {
    throw forbidden("Cross-origin request rejected");
  }
}
