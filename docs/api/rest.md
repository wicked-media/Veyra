# Veyra REST API (v1)

Base URL: `/api/v1`  
OpenAPI 3.1: `GET /api/openapi`  
Authentication: `veyra_session` HttpOnly cookie issued by sign-in.

The API is a transport over the same domain services as the UI. Organisation, role and user identity
are resolved from the session; they are **never** accepted from request bodies or query parameters.

## Conventions

- JSON request/response; UTF-8.
- Success: `{ "data": ... }`; errors: `{ "error": { "code", "message", "requestId", "details?" } }`.
- `cache-control: no-store` on API responses.
- Validation failures return `422`; malformed JSON returns `422`; body limit 256 KiB.
- Authentication failure `401`; permission denial `403`; inaccessible matter `404` (no existence
  disclosure); conflict `409`; rate limit `429`.
- Mutating requests with an `Origin` header must match `VEYRA_APP_URL`; mismatches return `403`.
- IDs are UUIDs. Invalid IDs return `404`.
- A user with a temporary password receives `403 PASSWORD_CHANGE_REQUIRED` until it is replaced.
- No pagination tokens yet; list endpoints accept a bounded `limit` (max 100) and return newest first.

## Endpoints

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/me` | authenticated | Actor, firm and effective permissions |
| GET | `/dashboard` | `matter:read` | Counts, recent matters, tasks, activity |
| GET | `/insights` | `report:read` + `matter:read` | Visibility-aware aggregates |
| GET | `/search?q=` | `matter:read` + `client:read` | Matter and client search |
| GET | `/matters` | `matter:read` | List matters (`status`, `practiceArea`, `q`, `limit`) |
| POST | `/matters` | `matter:create` | Open a matter |
| GET | `/matters/{id}` | `matter:read` + matter access | Matter workspace |
| PATCH | `/matters/{id}` | `matter:update` + access | Update title, stage, status, restriction, responsible |
| GET | `/matters/{id}/tasks` | `task:read` + access | Matter tasks |
| POST | `/matters/{id}/tasks` | `task:create` + access | Create a matter task |
| GET | `/tasks` | `task:read` | Visible tasks (`status`, `mine`, `limit`) |
| PATCH | `/tasks/{id}` | `task:update` | Status, priority, assignee, due date |
| GET | `/clients` | `client:read` | List clients (`status`, `q`, `limit`) |
| POST | `/clients` | `client:create` | Create client |
| GET | `/clients/{id}` | `client:read` | Client workspace |
| GET | `/audit` | `audit:read` | Visibility-filtered audit (`entityType`, `matterId`, `limit`) |
| GET | `/org` | authenticated | Firm profile |
| GET | `/org/members` | `user:read` | Firm members |
| POST | `/org/members` | `user:manage` | Invite member; may return one-time temporary password |
| PATCH | `/org/members/{id}` | `user:manage` | Change role |

Restricted/walled matters behave as if they do not exist. A task on such a matter is also hidden.

## Examples

### Sign in (server action, not API)

The sign-in form posts to a server action and sets the cookie. The API does not accept passwords.

### Create a client

```http
POST /api/v1/clients
Origin: https://app.veyra.example
Content-Type: application/json
Cookie: veyra_session=...

{
  "type": "organisation",
  "displayName": "Harbourline Developments Pty Ltd",
  "organisationName": "Harbourline Developments Pty Ltd",
  "email": "contact@example.com",
  "riskRating": "medium"
}
```

```json
{ "data": { "id": "..." } }
```

### Create a matter

```json
{
  "clientId": "uuid",
  "title": "Northshore retail lease",
  "practiceArea": "commercial",
  "responsibleUserId": "uuid",
  "restricted": false
}
```

Returns `{ "data": { "id": "...", "matterNumber": "MF-2026-0007" } }` with `201`.

### Error

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Matter not found",
    "requestId": "f0d..."
  }
}
```

## Security notes

- The API is cookie-authenticated. Browser clients must not be given tokens in URL parameters.
- Same-origin checks are complementary to `SameSite=Lax`; server-to-server callers without an Origin
  header are permitted by design but still need a valid session.
- Rate limiting exists on sign-in only in Stage 1; API rate limiting is planned.
- Audit events are written for mutations via domain services.
- The OpenAPI document is hand-maintained; `implementedRoutes` is enforced by a test.

## Versioning

`/api/v1` is the compatibility boundary. Additive fields are non-breaking; removing or changing
semantics requires a new version. The OpenAPI document version tracks the application version.
