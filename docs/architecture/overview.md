# Veyra architecture overview

## 1. Approach

Veyra is a **modular monolith**. One deployable application owns a small set of packages with clear
domain boundaries. This gives the transactional integrity, low operational overhead and simple
deployment a small legal practice needs, while keeping module boundaries explicit enough to extract
services later if scale or team structure justifies it.

Microservices are deliberately avoided. Splitting identity, permissions, matters and audit across
network boundaries before the domain is proven would multiply failure modes and weaken
transactional guarantees.

```
Browser
  │  HTTPS, HttpOnly session cookie
  ▼
apps/web (Next.js App Router)
  ├─ Server components / server actions ──┐
  ├─ /api/v1  → apps/api router           ├─→ packages/core (domain services)
  └─ /api/health                          │        │
                                          │        ├─→ packages/database (Drizzle)
                                          │        ├─→ packages/auth (sessions, matrix)
                                          │        └─→ packages/contracts (schemas, types)
                                          ▼
                                   PostgreSQL (production)
                                   PGlite (local/tests)
apps/worker → packages/database (session hygiene; future jobs)
```

## 2. Package boundaries

| Package | Responsibility | May depend on |
| --- | --- | --- |
| `packages/contracts` | Roles, permissions, domain enums, Zod input schemas, API shapes | nothing |
| `packages/auth` | Password hashing, session token/cookie primitives, permission bundles, rate limiter | contracts |
| `packages/database` | Schema, migrations, Postgres/PGlite driver, maintenance queries | — |
| `packages/core` | Authorisation choke points, audit, auth/OIDC session service, clients, matters, tasks, documents, calendar, AI orchestration, org admin, dashboards | contracts, auth, database, ai |
| `packages/ui` | Tokens-consuming presentational components | React, contracts (types only) |
| `packages/ai` | AI capability catalogue, provider abstraction, RAG prompt, configuration/policy guard | contracts |
| `packages/integrations` | Integration catalogue and credential status | — |
| `apps/api` | REST routing, validation, error mapping, OpenAPI | core, contracts, database |
| `apps/web` | UI, server actions, session resolution, API mount | all of the above |
| `apps/worker` | Background maintenance and future asynchronous jobs | database |

Domain logic never lives in React components or route handlers. The API and server actions are two
transports over the same services, so authorisation cannot diverge between them.

## 3. Runtime topology (Stage 1)

- One Next.js server process (`apps/web`) serving UI, server actions and `/api/v1`.
- One PostgreSQL database in production; embedded PGlite for local development and tests.
- One optional worker process for session cleanup (future queue consumer).
- Static assets served by the Next.js deployment platform.
- Development documents use a private local directory outside the web root. Production must replace
  this adapter with encrypted durable object storage; the application never returns a public URL.

`apps/api` is a workspace library, not a separate HTTP server. It is transport-neutral and can be
mounted by another adapter later. See [ADR 0002](../decisions/0002-single-deployable-api.md).

## 4. Authentication and session resolution

1. Sign-in validates input with Zod, rate-limits by IP + email and verifies an scrypt hash.
2. A 256-bit opaque token is generated. Only its SHA-256 hash is stored in `sessions`.
3. The browser receives `veyra_session` as `HttpOnly`, `SameSite=Lax`, `Secure` where configured,
   with a 12-hour lifetime.
4. Every request resolves the session and active membership from the database. The resulting `Actor`
   includes the firm, role, permissions and session id. Nothing is trusted from the client.
5. A temporary password forces the user to `/account/password` before any firm page or API call.
6. Password changes revoke all other sessions.

Production always resolves to OIDC, even when `VEYRA_AUTH_MODE=local` is requested. The flow uses
authorization code + PKCE, server-side one-time state/nonce transactions, discovery, JWKS and
ID-token verification, then a verified-email and MFA-claim policy. OIDC never auto-provisions an
account: an administrator must invite the user first. Local passwords remain available only outside
production and are refused by the sign-in service when the resolved mode is OIDC.

## 5. Tenancy and authorisation

Two layers, always applied in this order:

1. **Firm role permission** (`assertPermission`) — can this role perform this kind of operation?
2. **Matter visibility** (`visibleMatterCondition` / `requireMatterAccess`) — may this person see this
   specific matter?

Matter visibility combines:

- `matters.organisation_id = actor.organisationId`,
- no row in `matter_walls` for this user and matter,
- either the matter is unrestricted or the user is in `matter_members`.

Walls are a deny-list that applies to reads and writes, including owners and administrators.
Restricted matters require explicit team membership — no role bypass. A denied matter returns
`404 NOT_FOUND` so its existence is not disclosed.

Audit, tasks, dashboard activity, search, documents, calendar and AI retrieval all reuse the same
visibility conditions. A new matter-scoped feature must not invent a different query.

Documents add signature/MIME validation, immutable versions, private storage and an audited
download path. Deadline records are separate from ordinary events and remain `unverified` until a
human explicitly verifies them. AI retrieval filters by the same wall-aware condition before any
chunk reaches a provider, and citations are checked against the exact supplied chunk ids.

## 6. Data and transactions

- Every tenant row has `organisation_id`; foreign keys preserve referential integrity.
- Mutations use transactions for the domain change plus audit event.
- Matter numbering uses an atomic per-firm/per-year sequence row, unique on
  `(organisation_id, matter_number)`.
- Audit is append-only at the database level: triggers reject update, delete and truncate.
- Migrations are checked into `packages/database/migrations` and applied by the app on startup
  (Stage 1) or a dedicated migration job in production.

See [the data model](data-model.md).

## 7. API

`handleApiRequest(request, context)` receives a resolved `Actor`, database handle, canonical app URL
and request id. It:

- enforces same-origin for mutating requests carrying an `Origin` header,
- validates bodies/queries with Zod,
- routes to domain services,
- returns `{ data }` or `{ error: { code, message, requestId } }` with `no-store`,
- never accepts organisation, role or user identity from the body.

The OpenAPI document is hand-maintained and a test asserts every route listed in
`implementedRoutes` appears in it.

## 8. UI

- App Router with server components by default.
- Server actions for form mutations; each action re-resolves the session and calls a domain service.
- A compact component kit with semantic CSS variables and dark mode; no remote fonts.
- Permission-aware navigation is convenience only; the server is authoritative.
- Unbuilt modules show an explicit stage and guardrails instead of dead controls or fake data.

## 9. Failure and security posture

- Authorisation failures are typed (`AppError`) and mapped consistently (401/403/404/422/429/500).
- Unexpected errors are logged with a request id; the client gets a generic message.
- Rate limiting is process-local in Stage 1. Production requires a shared store (Redis or database)
  so limits survive instances and restarts.
- The OpenAI provider path exists but is disabled without a server-side key; production does not
  fall back to the local preview. No external integration connection is implemented.
- Health endpoint `GET /api/health` checks the database and returns 503 on failure.

## 10. Scaling and extraction path

If warranted later, extract in this order based on measured pressure:

1. Background/document processing worker (already a separate process).
2. API service behind its own load balancer (router is already transport-neutral).
3. Document/AI services with their own storage and queue.

Extraction requires stable domain interfaces, idempotent jobs, distributed sessions/rate limits and
observability. Until then, a modular monolith is the safer architecture.

## 11. Production environment expectations

- Australian-region hosting where available; TLS everywhere.
- Managed PostgreSQL with PITR, encryption and private networking.
- Managed OIDC issuer with MFA and verified email claims; test discovery/JWKS rotation and recovery.
- Encrypted private object storage with retention/legal hold, plus a real malware scanner.
- Secrets in a managed secret store, never in images or source.
- Multiple app instances behind a load balancer once session/rate-limit state is shared.
- Structured logs, metrics, error tracking and alerts.
- Backups tested by restore, not just scheduled.
