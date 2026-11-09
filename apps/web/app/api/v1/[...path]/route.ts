import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { handleApiRequest } from "@veyra/api";
import { SESSION_COOKIE } from "@veyra/auth";
import { getSessionContext } from "@veyra/core";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const requestId = randomUUID();
  const db = await getDb();
  const cookieStore = await cookies();
  const headerList = await headers();

  const forwarded = headerList.get("x-forwarded-for");
  const session = await getSessionContext(db, cookieStore.get(SESSION_COOKIE)?.value, {
    ip: forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null,
    userAgent: headerList.get("user-agent")
  });

  if (!session) {
    return Response.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Sign in to continue",
          requestId
        }
      },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  if (session.mustChangePassword) {
    return Response.json(
      {
        error: {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Replace your temporary password before using the API",
          requestId
        }
      },
      { status: 403, headers: { "cache-control": "no-store" } }
    );
  }

  const appUrl = process.env.VEYRA_APP_URL ?? new URL(request.url).origin;

  return handleApiRequest(request, {
    db,
    actor: session.actor,
    appUrl,
    requestId
  });
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
