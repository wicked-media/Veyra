/**
 * Hand-maintained OpenAPI 3.1 contract for the implemented REST surface.
 * A test asserts that every implemented route appears here, so the document
 * cannot silently drift behind the router.
 */
export const implementedRoutes = [
  ["get", "/me"],
  ["get", "/dashboard"],
  ["get", "/insights"],
  ["get", "/search"],
  ["get", "/matters"],
  ["post", "/matters"],
  ["get", "/matters/{id}"],
  ["patch", "/matters/{id}"],
  ["get", "/matters/{id}/tasks"],
  ["post", "/matters/{id}/tasks"],
  ["get", "/tasks"],
  ["patch", "/tasks/{id}"],
  ["get", "/clients"],
  ["post", "/clients"],
  ["get", "/clients/{id}"],
  ["get", "/audit"],
  ["get", "/org"],
  ["get", "/org/members"],
  ["post", "/org/members"],
  ["patch", "/org/members/{id}"]
] as const;

const errorSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      required: ["code", "message", "requestId"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        requestId: { type: "string" },
        details: {}
      }
    }
  }
};

function operation(summary: string, options: { mutation?: boolean } = {}) {
  return {
    summary,
    security: [{ sessionCookie: [] }],
    responses: {
      "200": { description: "Success" },
      "400": { description: "Invalid request", content: { "application/json": { schema: errorSchema } } },
      "401": { description: "Not signed in", content: { "application/json": { schema: errorSchema } } },
      "403": { description: "Not permitted", content: { "application/json": { schema: errorSchema } } },
      "404": { description: "Not found", content: { "application/json": { schema: errorSchema } } },
      ...(options.mutation
        ? {
            "409": {
              description: "Conflicting state",
              content: { "application/json": { schema: errorSchema } }
            },
            "422": {
              description: "Validation failed",
              content: { "application/json": { schema: errorSchema } }
            }
          }
        : {})
    }
  };
}

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" }
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Veyra REST API",
    version: "0.1.0",
    description:
      "Firm-scoped legal practice API. All access is authorised server-side from the session; organisation and role are never accepted from the client."
  },
  servers: [{ url: "/api/v1" }],
  security: [{ sessionCookie: [] }],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "veyra_session",
        description: "Opaque, HttpOnly session cookie issued by the sign-in flow."
      }
    },
    schemas: { Error: errorSchema }
  },
  paths: {
    "/me": { get: operation("Current actor, firm and permissions") },
    "/dashboard": { get: operation("Dashboard counters, recent matters, tasks and activity") },
    "/insights": { get: operation("Firm reporting aggregates") },
    "/search": { get: operation("Search matters and clients visible to the actor") },
    "/matters": {
      get: operation("List matters"),
      post: operation("Open a matter", { mutation: true })
    },
    "/matters/{id}": {
      get: operation("Matter workspace"),
      patch: operation("Update a matter", { mutation: true }),
      parameters: [idParameter]
    },
    "/matters/{id}/tasks": {
      get: operation("List tasks on a matter"),
      post: operation("Create a task on a matter", { mutation: true }),
      parameters: [idParameter]
    },
    "/tasks": { get: operation("List tasks visible to the actor") },
    "/tasks/{id}": {
      patch: operation("Update a task", { mutation: true }),
      parameters: [idParameter]
    },
    "/clients": {
      get: operation("List clients"),
      post: operation("Create a client", { mutation: true })
    },
    "/clients/{id}": {
      get: operation("Client workspace"),
      parameters: [idParameter]
    },
    "/audit": { get: operation("Audit events visible to the actor") },
    "/org": { get: operation("Firm profile") },
    "/org/members": {
      get: operation("List firm members"),
      post: operation("Invite a member", { mutation: true })
    },
    "/org/members/{id}": {
      patch: operation("Change a member's role", { mutation: true }),
      parameters: [idParameter]
    }
  }
} as const;
