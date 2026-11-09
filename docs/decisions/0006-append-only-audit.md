# ADR 0006 — Audit history is append-only at the database layer

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

Application-level "do not update audit" conventions are insufficient for legal evidence and incident
investigation. A bug, compromised query or careless admin could rewrite history.

## Decision

`audit_events` is append-only:

- a PL/pgSQL function raises an exception for mutation,
- `BEFORE UPDATE OR DELETE` row triggers,
- `BEFORE TRUNCATE` statement trigger,
- no application code path updates or deletes audit rows.

Audit events record actor, firm, action, entity, optional matter, metadata, IP, user agent and time.
Mutations write audit in the same transaction as the change.

## Consequences

- History survives application bugs and ordinary credential compromise.
- Corrections are new events (for example a reversal or correction event), not edits.
- A database superuser can disable triggers; production must use a restricted application role and
  protect migration credentials. This is a documented residual risk.
- Retention/deletion must be handled by a controlled archival process, not ad-hoc deletes.
