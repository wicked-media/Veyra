# ADR 0002 — Mount the REST API inside the Next.js application

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

The product needs a documented REST API, but Stage 1 has one deployable and cookie-based sessions.
Running a separate API server would require cross-service session validation, CORS, duplicated
authorisation and extra infrastructure before there is a consumer that needs it.

## Decision

Implement the API as `apps/api`, a transport-neutral handler:

```ts
handleApiRequest(request, { db, actor, appUrl, requestId })
```

`apps/web` mounts it at `/api/v1`. Session resolution, password-change enforcement and origin
configuration happen in the web adapter before the handler runs. Domain services are shared with
server actions.

## Consequences

- One origin, no CORS, cookies work naturally.
- API and UI cannot drift on authorisation.
- The router can later be mounted in a dedicated server without changing domain logic.
- A future standalone API must add a session/token strategy, rate limiting and its own security
  perimeter; this ADR does not pre-approve that move.
