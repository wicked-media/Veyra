# Veyra

**One Platform. Every Practice. Every Matter.**

Veyra is an Australia-first, AI-native legal practice operating system. It is designed to let a
firm run client intake, matters, documents, tasks, billing, compliance and — only after independent
validation — trust accounting inside one secure, permission-aware platform.

> **Status: Stage 2 practice core with Stage 3 documents/calendar and the Stage 4 controlled AI
> foundation.** Production identity is OIDC-only and fails closed without an issuer. Local
> credentials, local document storage and the extractive AI preview are development adapters. This
> repository is not production-ready, is not certified against any regulatory framework, and must
> not be used with real client data. Trust accounting remains locked. See [Limitations](#limitations).

---

## What is implemented

| Area | Status | Detail |
| --- | --- | --- |
| Firm tenancy and settings | Working | Organisations, matter numbering, time zone, financial year, offices and departments in the data model |
| Authentication | Working foundation | Production-only OIDC authorization code + PKCE, JWKS/ID-token verification, verified-email and MFA claim policy; local passwords are development-only |
| Roles and permissions | Working | Six roles, 41 fine-grained permissions, shared server/UI catalogue |
| Ethical walls and restricted matters | Working | Matter-level team access, deny-list walls, 404 instead of disclosure |
| Audit | Working | Append-only audit table with database triggers; permission- and visibility-filtered viewer |
| Clients | Working | Individual and organisation records, contacts, addresses, risk rating, notes, activity |
| Matters | Working | Workspace, teams, parties, numbering, stages, status, tasks, activity, access-aware lists |
| Tasks | Working | Matter and firm tasks, priorities, due dates, completion, audit |
| Dashboards and insights | Working | Counts and aggregates scoped to what the actor may see |
| REST API | Working | `/api/v1`, OpenAPI 3.1, cookie auth, same-origin enforcement |
| UI shell | Working | Responsive sidebar, top bar, command palette, dark mode, accessibility-minded tokens |
| Documents | Working foundation | Private local/object-store boundary, immutable versions, metadata and text search, authorised downloads, scan hook, audit |
| Calendar and deadlines | Working foundation | Matter/firm events, deadline records, explicit human verification, wall-aware queries |
| AI assistant | Working foundation | Matter-scoped retrieval, validated citations, prompt-injection framing, local extractive preview; provider-disabled in production without a key |
| Research, billing, portal | Not built | Honest staged pages; no fake functionality |
| Trust accounting | Locked | Security and regulatory release gate; no operational code |
| Background worker | Foundation | Session hygiene only |

The demonstration firm is **Marlow & Finch Legal** (synthetic data, `.demo` addresses):

```
Email:    eleanor@marlowfinch.demo
Password: Veyra!Demo2026
Role:     Owner
```

The demo seed only runs outside production and only against an empty local database.

---

## Stack

- **Application:** Next.js 15 App Router, React 19, strict TypeScript, Tailwind CSS v4
- **Data:** PostgreSQL, Drizzle ORM, SQL migrations; embedded PGlite for local development and tests
- **API:** REST under `/api/v1`, OpenAPI 3.1; transport-neutral handler that can later move to a dedicated service
- **Auth:** production OIDC + MFA; local credentials adapter is development-only
- **Validation:** Zod at every input boundary
- **Tests:** Vitest against real PGlite databases
- **Monorepo:** pnpm workspaces

No production credentials, external services or real client data are required to run this build.

---

## Quick start

Requirements: Node.js 20.9+ and pnpm 10.

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Open <http://localhost:3000>. On first run the local PGlite database is created, migrations are
applied and the synthetic demo firm is seeded. Data lives in `.data/pglite` and is never committed.

To use a real PostgreSQL server instead:

```bash
# .env
DATABASE_URL=postgresql://veyra:veyra@localhost:5432/veyra

pnpm db:migrate
pnpm db:seed:demo
```

### Production configuration

Production always resolves to OIDC, regardless of `VEYRA_AUTH_MODE`. Set `VEYRA_OIDC_ISSUER`,
`VEYRA_OIDC_CLIENT_ID` and (for a confidential client) `VEYRA_OIDC_CLIENT_SECRET`; the issuer must
publish discovery metadata and JWKS. Invite the user to the firm first: OIDC never auto-provisions
accounts. MFA is required by default. Configure `VEYRA_MALWARE_SCANNER_URL` and a durable private
`VEYRA_DOCUMENT_DIR` before accepting production uploads; otherwise document uploads fail closed.
Set `OPENAI_API_KEY` only after the AI evaluation and data-processing gates are complete; without
it, production AI is disabled rather than silently mocked.

### Verification

```bash
pnpm typecheck     # all workspace projects
pnpm lint          # ESLint, no suppressions for unused code
pnpm test          # integration and security tests against PGlite
pnpm build         # production Next.js build
pnpm verify        # typecheck + lint + test
```

Generate the permission matrix documentation after changing roles or permissions:

```bash
pnpm docs:permissions
```

---

## Repository map

```
apps/
  web/                 Next.js application, UI shell, server actions, API mount
  api/                 Transport-neutral REST router and OpenAPI contract
  worker/              Background jobs (session hygiene only in Stage 1)
packages/
  auth/                Password hashing, sessions, role permission matrix, rate limiting
  contracts/           Roles, permissions, domain enums, Zod schemas, API types
  core/                Domain services: auth, clients, matters, tasks, firm admin, dashboards, audit
  database/            Drizzle schema, dual Postgres/PGlite client, migrations
  ui/                  Small accessible component kit and design tokens
  ai/                  Capability catalogue and AI execution policy (no provider calls)
  integrations/        Provider catalogue and credential-status helpers (no connections)
docs/                  Product, architecture, security, compliance, decisions, API, runbooks
tests/                 Security, integration and contract tests
infrastructure/        Docker development stack
scripts/               Demo seed and documentation generation
```

The API lives in `apps/api` as a library because Stage 1 deploys one application. It is deliberately
transport-neutral so it can become a standalone service without rewriting domain logic.

---

## Security posture

- Every query is scoped to the signed-in actor's organisation; organisation and role are never
  accepted from the browser.
- Matter visibility combines tenant scope, ethical walls and restricted-matter team membership in a
  single choke point (`packages/core/src/access.ts`). Walls beat every role, including owner.
- Denied access to a restricted or walled matter returns **404**, not 403, to avoid disclosing that
  the matter exists.
- Passwords use scrypt with per-user salt; session tokens are random 256-bit values and only their
  SHA-256 hashes are stored.
- The session cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, with a 12-hour expiry.
  Password changes revoke all other sessions.
- Mutating REST requests enforce same-origin when an `Origin` header is present.
- Audit records are append-only at the database level (triggers reject update, delete and truncate).
- The application sends standard security headers and uses no third-party fonts or trackers.
- Document downloads require matter access, a clean scan and an audited request. No public document URLs exist.
- OIDC transactions are one-time, PKCE-protected and short-lived; local password sign-in is refused in production.
- AI retrieval is matter-scoped and citation-validated. Source text is framed as untrusted evidence, not instructions; AI can only propose a task, never execute one.

Known gaps are documented in [the threat model](docs/security/threat-model.md). This code has not
had an independent penetration test.

To report a security issue, use the private process in [SECURITY.md](SECURITY.md). Do not open a
public issue.

---

## Documentation

- [Product requirements](docs/product/PRD.md)
- [Module catalogue](docs/product/module-catalogue.md)
- [Roadmap and acceptance gates](docs/product/roadmap.md)
- [Development backlog](docs/product/backlog.md)
- [Architecture overview](docs/architecture/overview.md)
- [Data model](docs/architecture/data-model.md)
- [AI architecture](docs/architecture/ai.md)
- [Integration architecture](docs/architecture/integrations.md)
- [Threat model](docs/security/threat-model.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md)
- [Permission matrix](docs/security/permission-matrix.md)
- [Regulatory map](docs/compliance/regulatory-map.md)
- [API guide](docs/api/rest.md)
- [Local development](docs/runbooks/local-development.md) · [Deployment](docs/runbooks/deployment.md) ·
  [Backup and restore](docs/runbooks/backup-restore.md) · [Incident response](docs/runbooks/incident-response.md)
- Architecture decisions in [`docs/decisions`](docs/decisions)

---

## Limitations

1. **OIDC is not verified against a real managed identity provider in this environment.** The
   policy and token verification paths are tested, but an external issuer must be configured and
   end-to-end tested before production use. The local password adapter is development-only.
2. **Document storage is local-filesystem for development.** Production requires a durable private
   object-store adapter with encryption, retention and backup. PDF/DOCX OCR is not enabled.
3. **The malware scanner is a provider hook.** Development uses a labelled local validation
   adapter; production fails closed without a real scanning service.
4. **AI uses a local extractive preview in development.** The production provider path requires a
   key and has not passed an independent evaluation or data-processing review. It is not enabled.
5. **Trust accounting is not implemented.** Passing software tests would not make it compliant. It
   requires specialist legal accounting review and independent validation before release.
6. **No independent security, privacy or legal review.** Do not claim compliance or certification.
7. **The demo firm is synthetic.** Never load real client data into development environments.

## Recommended next assignment

Harden **Stage 3/4** before production: replace local document storage with encrypted private object
storage, connect a real malware scanner, add an ingestion/OCR worker, configure and penetration-test
OIDC with the chosen managed identity provider, build the AI evaluation and data-processing gates,
and complete retention/legal-hold and backup/restore evidence. Then run independent security review.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Participation is governed by
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report security issues privately via
[SECURITY.md](SECURITY.md), not in a public issue.

## Licence

Veyra is released under the [MIT License](LICENSE).

Copyright © 2026 Veyra contributors.
