import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  shouldUseSecureCookies
} from "@veyra/auth";
import { getRequestMeta } from "@/lib/session";
import { completeOidcSignIn } from "@/lib/oidc";
import { recordOidcFailure } from "@veyra/core";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appUrl(): URL {
  return new URL(process.env.VEYRA_APP_URL?.trim() || "http://localhost:3000");
}

function signInError(message: string): NextResponse {
  const url = appUrl();
  url.pathname = "/sign-in";
  url.search = "";
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest): Promise<Response> {
  const meta = await getRequestMeta();
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const providerError = request.nextUrl.searchParams.get("error");

  if (providerError) {
    await recordOidcFailure(await getDb(), `provider_error:${providerError}`, meta);
    return signInError("The identity provider did not complete sign-in. Try again.");
  }
  if (!state || !code) {
    return signInError("The identity sign-in response was incomplete. Start again.");
  }

  try {
    const { result, returnTo } = await completeOidcSignIn(code, state, meta);
    const response = NextResponse.redirect(new URL(returnTo, appUrl()));
    response.cookies.set(
      SESSION_COOKIE,
      result.token,
      sessionCookieOptions(shouldUseSecureCookies())
    );
    return response;
  } catch (error) {
    console.error("[veyra] OIDC callback failed", error);
    await recordOidcFailure(
      await getDb(),
      error instanceof Error ? error.message : "unknown_callback_failure",
      meta
    );
    return signInError("Identity sign-in could not be completed. Try again or contact your administrator.");
  }
}
