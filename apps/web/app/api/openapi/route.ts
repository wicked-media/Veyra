import { openApiDocument } from "@veyra/api/openapi";

export const runtime = "nodejs";

export function GET() {
  return Response.json(openApiDocument, {
    headers: { "cache-control": "public, max-age=300" }
  });
}
