# Runbook — local development

## Requirements

- Node.js 20.9+ (Node 22 LTS recommended)
- pnpm 10 (`corepack enable` or `npm install -g pnpm@10.34.9`)
- No PostgreSQL server required; PGlite runs embedded

## First run

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open <http://localhost:3000>. The local database at `.data/pglite` is migrated and seeded with the
synthetic Marlow & Finch firm on first use.

Demo credentials:

```
eleanor@marlowfinch.demo / Veyra!Demo2026
```

The seed refuses `NODE_ENV=production` and skips when any firm already exists. Never put real client
data in `.data`.

## Environment

| Variable | Purpose |
| --- | --- |
| `VEYRA_APP_URL` | Canonical origin for cookies and same-origin checks (default `http://localhost:3000`) |
| `DATABASE_URL` | Optional PostgreSQL connection; takes precedence over PGlite |
| `VEYRA_DB_DIR` | PGlite directory (default `.data/pglite`) |
| `VEYRA_AUTO_SEED` | Set `false` to skip the demo seed on an empty local DB |
| `VEYRA_DEV_ORIGIN` | Extra allowed dev origin for a preview proxy |
| `OPENAI_API_KEY` | Never required; AI remains disabled even if present |

Secrets go in `.env`, which is untracked. Do not commit them.

## Useful commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify
pnpm db:generate     # after schema changes; review the SQL
pnpm db:seed:demo
pnpm worker          # session-maintenance worker
pnpm docs:permissions
```

## Reset the local database

Stop the dev server first: PGlite allows one process at a time.

```bash
rm -rf .data/pglite
pnpm dev
```

This destroys local synthetic data only. Never run this against a shared or production database.

## Using PostgreSQL locally

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d db
DATABASE_URL=postgresql://veyra:veyra@localhost:5432/veyra pnpm db:migrate
DATABASE_URL=postgresql://veyra:veyra@localhost:5432/veyra pnpm db:seed:demo
DATABASE_URL=... pnpm dev
```

## Troubleshooting

| Symptom | Cause / action |
| --- | --- |
| `database is locked` or PGlite startup error | Another process (dev server, seed, test) is using `.data/pglite`. Stop it or use a separate `VEYRA_DB_DIR`. |
| Redirected to sign-in repeatedly | Cookie is `Secure` on a non-HTTPS origin. Use `VEYRA_APP_URL` matching the scheme; local HTTP on localhost is supported. |
| Sign-in rate-limited | Wait 15 minutes or restart the process (the limiter is in-memory). |
| Demo seed skipped | The DB already has a firm. Reset or use a fresh DB. |
| Preview host blocked | Set the exact preview hostname in `VEYRA_DEV_ORIGIN` and restart. |
| Worker exits immediately | Check `DATABASE_URL` and migration output; production requires `DATABASE_URL`. |

## Testing notes

Tests create in-memory PGlite databases and apply the real migrations, including the audit triggers.
They run in forked processes, so `pnpm test` is safe alongside a running dev server with a different
database. Do not point tests at a shared PostgreSQL database; they create and mutate data.
