# ADR 0001 — Modular monolith for the initial platform

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

Veyra spans many legal domains but starts with a small team and no validated scale. Client, matter,
permission and audit integrity must be transactional. Microservices would add network failures,
distributed transactions, duplicated authorisation and operational cost before the domain is proven.

## Decision

Build one deployable application with explicit module boundaries:

- `apps/web` hosts UI, server actions and the REST mount.
- `apps/api` is a transport-neutral router library.
- `packages/core` owns domain services and authorisation choke points.
- `packages/database`, `auth`, `contracts`, `ui`, `ai`, `integrations` have narrow responsibilities.
- `apps/worker` is a separate process for asynchronous work.

No module may query across a domain boundary or duplicate client/matter storage.

## Consequences

**Positive:** strong transactions, one deployment, simpler debugging, shared schemas, easier
security review, low operating cost.

**Negative:** one deploy unit can couple release cadence; a runaway module can affect the whole app;
scale-out requires shared session/rate-limit state.

**Mitigation:** enforce package boundaries, keep the API transport-neutral, put slow work in the
worker, and extract only with measured need. Extraction order is documented in the architecture
overview.
