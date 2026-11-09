# Contributing to Veyra

Veyra is an Australia-first, AI-native legal practice operating system. Contributions are welcome:
security fixes, correctness and accessibility improvements, tests, documentation and careful product
work.

Veyra is a development foundation, not a production service. Do not use real client, personal or
privileged data in issues, pull requests, tests, fixtures, screenshots or demos.

## Before you start

- Read [AGENTS.md](AGENTS.md), the [README limitations](README.md#limitations), the
  [security policy](SECURITY.md) and the [code of conduct](CODE_OF_CONDUCT.md).
- Open an issue before a substantial change so scope and security implications can be discussed.
- Report vulnerabilities privately through [SECURITY.md](SECURITY.md), never in a public issue.

## Development setup

Requirements: Node.js 20.9+ and pnpm 10.

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

The default database is embedded PGlite under `.data/`; the synthetic demo firm is seeded only when
the database is empty. To use PostgreSQL, set `DATABASE_URL`, then run `pnpm db:migrate` and
`pnpm db:seed:demo`.

Never commit `.env`, `.data/`, generated builds or credentials. Use pnpm and preserve
`pnpm-lock.yaml`; do not upgrade dependencies as part of an unrelated change.

## Checks

Run the narrowest useful check while working, then the full relevant set before opening a pull
request:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm verify` runs typecheck, lint and tests. CI runs all four checks, including the production
build. Do not weaken a test, suppress a lint error, or bypass a security check to make CI pass.

If you change roles or permissions, run `pnpm docs:permissions` and update the relevant tests. If you
add an API route, add it to `implementedRoutes` and the OpenAPI document; the contract test enforces
this.

## Security and architecture rules

- Every tenant read and write is scoped server-side. Never trust an organisation, role, permission or
  user ID from the client.
- Matter access must pass through `requireMatterAccess` / `visibleMatterCondition` in
  `packages/core/src/access.ts`. Ethical walls always deny, including for owners.
- Mutations that must be atomic write their audit event in the same transaction. Audit records are
  append-only.
- Keep domain logic in `packages/core`; route handlers, server actions and components must not issue
  ad-hoc database queries for business operations.
- No public document URLs. Downloads require matter access, a clean scan and an audit event.
- AI is matter-scoped, citation-validated and advisory. It may propose actions but must never file,
  send, move money or make final legal decisions. Consequential actions need a different authorised
  human approver.
- Trust accounting remains locked until independent specialist review. Do not add operational trust
  posting "temporarily".
- No development authentication bypass in production and no hardcoded secrets or production data.
- Do not claim regulatory compliance, certification or legal correctness without independent
  evidence.

## Tests and documentation

- New security boundary: test both allowed and denied paths, including cross-tenant and ethical-wall
  cases.
- New mutation: test persistence, the audit event and permission denial.
- New UI: verify keyboard access and both colour themes where relevant.
- Update the relevant README section, architecture or security document. Record significant,
  hard-to-reverse decisions as an ADR in `docs/decisions`.
- Regenerate `docs/security/permission-matrix.md` with `pnpm docs:permissions`; never edit it by hand.

## Pull requests

Keep each pull request focused. Describe the problem, the approach, the security impact and the
checks you ran. Include reproduction steps for bug fixes and screenshots for visible UI changes.
Remove secrets and real data from logs, fixtures and screenshots.

By submitting a contribution, you agree that it is licensed under the repository's
[MIT License](LICENSE). You remain responsible for the code you submit, including any AI-assisted
work; disclose substantial AI assistance in the pull request.

Maintainers may close contributions that ignore these rules or put tenant isolation, confidentiality
or auditability at risk.
