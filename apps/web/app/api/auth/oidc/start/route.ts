import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@veyra/auth";
import { getRequestMeta } from "@/lib/session";
import { beginOidcSignIn } from "@/lib/oidc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function signInErrorUrl(message: string): URL {
  const appUrl = process.env.VEYRA_APP_URL?.trim() || "http://localhost:3000";
  const url = new URL("/sign-in", appUrl);
  url.searchParams.set("error", message);
  return url;
}

export async function GET(request: NextRequest): Promise<Response> {
  const meta = await getRequestMeta();
  const limit = checkRateLimit(`oidc-start:${meta.ip ?? "unknown"}`, {
    limit: 20,
    windowMs: 15 * 60 * 1000
  });
  if (!limit.allowed) {
    return NextResponse.redirect(signInErrorUrl("Too many sign-in attempts. Try again shortly."));
  }

  try {
    const url = await beginOidcSignIn(request.nextUrl.searchParams.get("returnTo"));
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[veyra] OIDC start failed", error);
    return NextResponse.redirect(
      signInErrorUrl("Identity sign-in could not be started. Contact your firm administrator.")
    );
  }
}
