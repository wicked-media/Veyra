# ADR 0005 — Matter access combines restrictions, team membership and ethical walls

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

Legal confidentiality is not satisfied by firm-level roles. A firm owner may be conflicted; a
paralegal may support one matter but not another; a restricted matter must not even be discoverable
by people outside its team.

## Decision

Matter visibility is a single server-side condition:

1. tenant scope (`organisation_id = actor.organisation_id`),
2. **no** ethical wall row for the actor and matter (deny always wins),
3. either the matter is unrestricted or the actor is explicitly in `matter_members`.

All matter-derived reads and writes use this through `requireMatterAccess` or
`visibleMatterCondition`: workspace, lists, tasks, audit, dashboard activity, insights and search.
A denied restricted/walled matter returns **404**, not 403, so existence is not disclosed.

Role permissions still gate the operation (for example `matter:create`); the matter condition can
only narrow access.

## Consequences

- Owners/admins cannot bypass walls; this is deliberate and tested.
- New matter-scoped features must reuse the choke point, adding review burden but preventing drift.
- Matter teams are required for restricted matters; future UI must make access management explicit.
- A support/break-glass process must be separately designed, time-bound and audited — never a silent
  bypass.
