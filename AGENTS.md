# AGENTS.md — Veyra engineering instructions

Veyra is an Australian legal practice operating system. Confidentiality, tenant isolation,
auditability and correctness outrank feature velocity. Read this file before changing code.

## Commands

```bash
pnpm install
pnpm dev                 # Next.js on 0.0.0.0:3000, embedded PGlite + demo seed
pnpm typecheck           # every workspace project
pnpm lint
pnpm test                # Vitest + PGlite
pnpm build
pnpm verify              # typecheck + lint + test
pnpm db:generate         # Drizzle migration after schema changes
pnpm db:migrate
pnpm db:seed:demo        # refuses NODE_ENV=production
pnpm docs:permissions    # regenerate the permission matrix doc
pnpm worker
```

Use pnpm. Do not replace the lockfile or upgrade dependencies without a reason and verification.

## Architecture rules

1. `apps/web` is the only deployable in Stage 1. `apps/api` is transport-neutral; do not put domain
   logic in the router.
2. Domain logic belongs in `packages/core`. Route handlers, server actions and React components must
   not issue ad-hoc database queries for business operations.
3. All tenant tables carry `organisation_id`. Every read and write is scoped server-side. Never trust
   an organisation, role, permission or user id from the client.
4. Matter access goes through `requireMatterAccess` / `visibleMatterCondition` in
   `packages/core/src/access.ts`. Do not write a new matter query without it.
5. Ethical walls always deny, including for owners. Restricted matters require explicit team
   membership. Denials return 404 to avoid disclosing existence.
6. Mutations that must be atomic write their audit event in the same transaction.
7. Audit records are append-only. Never add application code that updates or deletes them.
8. Permissions are defined once in `packages/contracts/src/permissions.ts` and mapped once in
   `packages/auth/src/permissions.ts`. Update both plus tests and run `pnpm docs:permissions`.
9. Use Zod schemas from `packages/contracts` at every boundary. API validation errors are 422.
10. Money — when implemented — uses integer minor units or exact decimal strings, never floating
    point. Stage 1 has no financial calculations.

## Security invariants

- No hardcoded secrets, credentials or production data. `.env` stays untracked.
- No development auth bypass in production. The local password adapter is a development adapter.
- No public document URLs. Documents will be served only after server-side authorisation.
- No AI request may retrieve across matters or permissions. AI capability calls must pass
  `assertAiExecutionAllowed` and remain disabled until Stage 4 controls exist.
- No AI may file documents, send communications, move money or make final legal determinations.
- Trust accounting remains locked until independent specialist review. Do not add operational trust
  posting "temporarily".
- Do not weaken rate limiting, CSRF/origin checks, password hashing parameters or cookie flags to
  make a test pass.

## Code conventions

- Strict TypeScript. No `any`, no non-null assertions to silence errors, no lint suppressions for
  unused code.
- Server components by default; `"use client"` only for interaction. Server actions are used for form
  mutations and must re-check the session and permissions.
- Follow the existing visual language: semantic tokens (`bg-surface`, `text-ink`, `text-muted`),
  compact professional typography, navy/teal identity, dark mode.
- Every visible interactive control must work or be plainly marked as unavailable. Do not fabricate
  success states, metrics, integrations or legal data.
- Prefer editing existing files. Add a package only when a real boundary needs it.

## Testing requirements

- New security boundary → test allowed and denied paths, including cross-tenant and wall cases.
- New mutation → test persistence, audit event and permission denial.
- New API route → add it to `implementedRoutes` and the OpenAPI document; the contract test enforces
  this.
- Run the narrowest relevant check while iterating, then `pnpm typecheck`, `pnpm lint` and
  `pnpm test` before finishing. Report failures honestly.

## Documentation requirements

Update the relevant document when behaviour, architecture, security controls or the roadmap changes.
Record significant, hard-to-reverse decisions as an ADR in `docs/decisions`. Update
`docs/security/permission-matrix.md` via the generator, never by hand.

## Definition of done

A feature is done only when its UI works, its server-side authorisation is enforced, data persists,
validation and errors are handled, relevant tests pass, audit events are written where appropriate,
documentation is updated, and no known critical security issue remains. A demo is not a
production-ready feature.

## Regulatory constraints

Design for Australian Privacy Principles, solicitor confidentiality and privilege, retention
obligations, costs disclosure, AML/CTF where applicable and state/territory differences. Do not
claim compliance, certification or legal correctness without independent evidence. Never use real
client data without authorisation.
