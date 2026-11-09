import { z } from "zod";
import type { VeyraDb } from "@veyra/database";
import {
  createClientSchema,
  createMatterSchema,
  createTaskSchema,
  inviteMemberSchema,
  listClientsQuerySchema,
  listMattersQuerySchema,
  listTasksQuerySchema,
  searchQuerySchema,
  updateMatterSchema,
  updateMemberRoleSchema,
  updateTaskSchema,
  uuidSchema
} from "@veyra/contracts";
import {
  createClient,
  createMatter,
  createTask,
  getClientWorkspace,
  getDashboard,
  getInsights,
  getMatterWorkspace,
  getOrganisation,
  inviteMember,
  listAuditEvents,
  listClients,
  listMatters,
  listMatterTasks,
  listMembers,
  listTasks,
  notFound,
  updateMatter,
  updateMemberRole,
  updateTask,
  type Actor
} from "@veyra/core";
import { assertSameOrigin, jsonResponse, parseBody, parseQuery, toErrorResponse } from "./http";

export * from "./openapi";
export { assertSameOrigin } from "./http";

export interface ApiContext {
  db: VeyraDb;
  actor: Actor;
  appUrl: string;
  requestId: string;
}

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  entityType: z.string().trim().max(60).optional(),
  matterId: uuidSchema.optional()
});

function uuidOrThrow(value: string): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw notFound("Not found");
  return parsed.data;
}

/**
 * Transport-neutral API entrypoint. In Stage 1 the Next.js app mounts it at
 * /api/v1; the same handler can later run behind a dedicated HTTP server.
 */
export async function handleApiRequest(request: Request, context: ApiContext): Promise<Response> {
  const { requestId } = context;

  try {
    assertSameOrigin(request, context.appUrl);

    const url = new URL(request.url);
    const prefix = "/api/v1";
    if (!url.pathname.startsWith(prefix)) {
      return jsonResponse({ message: "Not found" }, 404, requestId);
    }

    const segments = url.pathname
      .slice(prefix.length)
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));

    const method = request.method.toUpperCase();
    const { db, actor } = context;

    if (segments.length === 0) {
      return jsonResponse({ message: "Veyra API v1" }, 200, requestId);
    }

    const [resource, id, sub] = segments;

    if (resource === "me" && segments.length === 1 && method === "GET") {
      const organisation = await getOrganisation(db, actor);
      return jsonResponse({ actor, organisation }, 200, requestId);
    }

    if (resource === "dashboard" && segments.length === 1 && method === "GET") {
      return jsonResponse(await getDashboard(db, actor), 200, requestId);
    }

    if (resource === "insights" && segments.length === 1 && method === "GET") {
      return jsonResponse(await getInsights(db, actor), 200, requestId);
    }

    if (resource === "search" && segments.length === 1 && method === "GET") {
      const query = parseQuery(url, searchQuerySchema);
      const [matterRows, clientRows] = await Promise.all([
        listMatters(db, actor, { q: query.q, limit: query.limit, status: "all" }),
        listClients(db, actor, { q: query.q, limit: query.limit, status: "active" })
      ]);
      return jsonResponse({ matters: matterRows, clients: clientRows }, 200, requestId);
    }

    if (resource === "matters") {
      if (segments.length === 1 && method === "GET") {
        const query = parseQuery(url, listMattersQuerySchema);
        return jsonResponse(await listMatters(db, actor, query), 200, requestId);
      }

      if (segments.length === 1 && method === "POST") {
        const input = await parseBody(request, createMatterSchema);
        return jsonResponse(await createMatter(db, actor, input), 201, requestId);
      }

      if (id && segments.length === 2 && method === "GET") {
        return jsonResponse(await getMatterWorkspace(db, actor, uuidOrThrow(id)), 200, requestId);
      }

      if (id && segments.length === 2 && method === "PATCH") {
        const input = await parseBody(request, updateMatterSchema);
        await updateMatter(db, actor, uuidOrThrow(id), input);
        return jsonResponse({ updated: true }, 200, requestId);
      }

      if (id && sub === "tasks" && segments.length === 3) {
        if (method === "GET") {
          return jsonResponse(await listMatterTasks(db, actor, uuidOrThrow(id)), 200, requestId);
        }
        if (method === "POST") {
          const input = await parseBody(request, createTaskSchema.omit({ matterId: true }));
          const task = await createTask(db, actor, {
            ...input,
            assigneeUserId: input.assigneeUserId ?? null,
            matterId: uuidOrThrow(id)
          });
          return jsonResponse(task, 201, requestId);
        }
      }
    }

    if (resource === "tasks") {
      if (segments.length === 1 && method === "GET") {
        const query = parseQuery(url, listTasksQuerySchema);
        return jsonResponse(await listTasks(db, actor, query), 200, requestId);
      }
      if (id && segments.length === 2 && method === "PATCH") {
        const input = await parseBody(request, updateTaskSchema);
        await updateTask(db, actor, uuidOrThrow(id), input);
        return jsonResponse({ updated: true }, 200, requestId);
      }
    }

    if (resource === "clients") {
      if (segments.length === 1 && method === "GET") {
        const query = parseQuery(url, listClientsQuerySchema);
        return jsonResponse(await listClients(db, actor, query), 200, requestId);
      }
      if (segments.length === 1 && method === "POST") {
        const input = await parseBody(request, createClientSchema);
        return jsonResponse(await createClient(db, actor, input), 201, requestId);
      }
      if (id && segments.length === 2 && method === "GET") {
        return jsonResponse(await getClientWorkspace(db, actor, uuidOrThrow(id)), 200, requestId);
      }
    }

    if (resource === "audit" && segments.length === 1 && method === "GET") {
      const query = parseQuery(url, auditQuerySchema);
      return jsonResponse(await listAuditEvents(db, actor, query), 200, requestId);
    }

    if (resource === "org") {
      if (segments.length === 1 && method === "GET") {
        return jsonResponse(await getOrganisation(db, actor), 200, requestId);
      }
      if (sub === "members" && id && segments.length === 3 && method === "PATCH") {
        const input = await parseBody(request, updateMemberRoleSchema.omit({ membershipId: true }));
        await updateMemberRole(db, actor, uuidOrThrow(id), input.role);
        return jsonResponse({ updated: true }, 200, requestId);
      }
      if (sub === "members" && segments.length === 2) {
        if (method === "GET") {
          return jsonResponse(await listMembers(db, actor), 200, requestId);
        }
        if (method === "POST") {
          const input = await parseBody(request, inviteMemberSchema);
          return jsonResponse(await inviteMember(db, actor, input), 201, requestId);
        }
      }
    }

    return jsonResponse({ message: "Not found" }, 404, requestId);
  } catch (error) {
    return toErrorResponse(error, requestId);
  }
}
