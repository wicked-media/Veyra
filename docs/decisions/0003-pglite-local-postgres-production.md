# ADR 0003 — PGlite locally and in tests; PostgreSQL in production

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

Development and CI need a real SQL database without requiring every developer to run PostgreSQL.
Production needs a managed, backed-up, highly available PostgreSQL service.

## Decision

Use one Drizzle schema and one migration set with two drivers:

- `DATABASE_URL` set → `pg` Pool against PostgreSQL.
- Otherwise → embedded PGlite, persisted in `.data/pglite` (or in-memory in tests).

The application migrates on startup in Stage 1. Production should run migrations as a dedicated job.

## Consequences

**Positive:** zero-setup local development, real SQL semantics in tests, identical schema.

**Negative:** PGlite is single-process and not a PostgreSQL HA/load substitute; driver-specific
behaviour can differ; concurrent connection tests cannot be run against it.

**Mitigation:** CI runs the same tests; before production, run migrations, load, concurrency,
backup/restore and failover tests against managed PostgreSQL. Do not treat PGlite tests as production
capacity evidence.
