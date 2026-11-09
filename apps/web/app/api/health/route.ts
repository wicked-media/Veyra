import { checkDatabase } from "@veyra/database";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await checkDatabase(await getDb());
    return Response.json(
      { status: "ok" },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    console.error(
      "[veyra] health check failed",
      error instanceof Error ? error.stack : error
    );
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
