import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@veyra/auth";
import { getSessionContext, type RequestMeta, type SessionContext } from "@veyra/core";
import { getDb } from "./db";

export async function getRequestMeta(): Promise<RequestMeta> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ip: forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null,
    userAgent: headerList.get("user-agent")
  };
}

export const getSession = cache(async (): Promise<SessionContext | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getSessionContext(await getDb(), token, await getRequestMeta());
});

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/**
 * Every protected page/action uses this: a temporary password must be replaced
 * before the rest of the firm can be used. The middleware supplies the current
 * pathname so the password screen itself is not redirected.
 */
export async function requireAppSession(): Promise<SessionContext> {
  const session = await requireSession();
  const headerList = await headers();
  const pathname = headerList.get("x-veyra-pathname") ?? "";
  if (session.mustChangePassword && pathname !== "/account/password") {
    redirect("/account/password");
  }
  return session;
}

export async function requireActor() {
  return (await requireAppSession()).actor;
}
