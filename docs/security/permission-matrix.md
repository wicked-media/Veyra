# Role and permission matrix

> Generated from `packages/contracts/src/permissions.ts` and
> `packages/auth/src/permissions.ts` by `pnpm docs:permissions`.
> Do not edit this table by hand.

Roles are firm-level defaults. Every operation is authorised on the server.
Matter restrictions and ethical walls are applied **after** these grants and can
only reduce access — they never grant it.

## Role summary

| Role | Default scope |
| --- | --- |
| **Owner** | Full control of the firm, including billing and security settings. |
| **Firm administrator** | Runs the firm day to day. Cannot access trust operations or billing ownership. |
| **Principal** | Senior legal practitioner with oversight of clients, matters and teams. |
| **Solicitor** | Practises on matters, records time and manages matter work. |
| **Paralegal** | Supports matters and documents without access to financials. |
| **Accounts** | Billing, trust accounting and financial reporting only. |

## Matrix

| Permission | Owner | Firm administrator | Principal | Solicitor | Paralegal | Accounts |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Firm administration** |  |  |  |  |  |  |
| View firm profile (`org:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Manage firm settings (`org:manage`) | Yes | Yes | — | — | — | — |
| Manage subscription and billing (`org:billing`) | Yes | — | — | — | — | — |
| View users (`user:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Invite and manage users (`user:manage`) | Yes | Yes | — | — | — | — |
| View audit log (`audit:read`) | Yes | Yes | Yes | — | — | — |
| **Clients and conflicts** |  |  |  |  |  |  |
| View clients (`client:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Create clients (`client:create`) | Yes | Yes | Yes | Yes | — | — |
| Update clients (`client:update`) | Yes | Yes | Yes | Yes | — | — |
| Archive clients (`client:archive`) | Yes | Yes | Yes | — | — | — |
| Record conflict decisions (`conflict:manage`) | Yes | Yes | Yes | — | — | — |
| **Matters** |  |  |  |  |  |  |
| View matters (`matter:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Open matters (`matter:create`) | Yes | Yes | Yes | Yes | — | — |
| Update matters and tasks (`matter:update`) | Yes | Yes | Yes | Yes | — | — |
| Close matters (`matter:close`) | Yes | Yes | Yes | Yes | — | — |
| Reopen matters (`matter:reopen`) | Yes | Yes | Yes | — | — | — |
| Manage team and ethical walls (`matter:manage_access`) | Yes | Yes | Yes | — | — | — |
| View matter financials (`matter:read_financials`) | Yes | Yes | Yes | Yes | — | Yes |
| **Documents** |  |  |  |  |  |  |
| View documents (`document:read`) | Yes | Yes | Yes | Yes | Yes | — |
| Upload documents (`document:upload`) | Yes | Yes | Yes | Yes | Yes | — |
| Manage documents and versions (`document:manage`) | Yes | Yes | Yes | — | — | — |
| **Calendar and deadlines** |  |  |  |  |  |  |
| View calendar and deadlines (`calendar:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Create events and deadlines (`calendar:create`) | Yes | Yes | Yes | Yes | Yes | — |
| Edit and verify events and deadlines (`calendar:update`) | Yes | Yes | Yes | Yes | — | — |
| **Tasks** |  |  |  |  |  |  |
| View tasks (`task:read`) | Yes | Yes | Yes | Yes | Yes | — |
| Create tasks (`task:create`) | Yes | Yes | Yes | Yes | Yes | — |
| Complete and reassign tasks (`task:update`) | Yes | Yes | Yes | Yes | Yes | — |
| **Time, billing and trust** |  |  |  |  |  |  |
| View time entries (`time:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Record time (`time:record`) | Yes | Yes | Yes | Yes | Yes | — |
| View invoices and financials (`billing:read`) | Yes | Yes | Yes | Yes | — | Yes |
| Prepare and issue invoices (`billing:manage`) | Yes | Yes | Yes | — | — | Yes |
| Approve invoices (`invoice:approve`) | Yes | Yes | Yes | — | — | Yes |
| View trust balances (`trust:read`) | Yes | Yes | Yes | — | — | Yes |
| Post trust transactions (`trust:manage`) | Yes | — | — | — | — | Yes |
| **Matter-scoped AI** |  |  |  |  |  |  |
| Ask questions using authorised matter sources (`ai:use`) | Yes | Yes | Yes | Yes | — | — |
| **Operations and configuration** |  |  |  |  |  |  |
| View reports and insights (`report:read`) | Yes | Yes | Yes | Yes | — | Yes |
| Manage client portal access (`portal:manage`) | Yes | Yes | Yes | — | — | — |
| View integrations (`integration:read`) | Yes | Yes | Yes | Yes | Yes | Yes |
| Connect integrations (`integration:manage`) | Yes | Yes | — | — | — | — |
| Manage templates (`template:manage`) | Yes | Yes | Yes | — | — | — |
| Manage workflows (`workflow:manage`) | Yes | Yes | Yes | — | — | — |

## Enforcement notes

- An owner or administrator does **not** bypass an ethical wall. The wall is a deny-list.
- A restricted matter requires explicit matter membership even for owners.
- Denied access to a restricted or walled matter returns `404 Not Found`, not `403`, so the
  existence of the matter is not disclosed.
- API and server actions resolve the actor from the session. Client-supplied organisation,
  role and permission values are ignored.
- Trust permissions exist for the future trust module, but trust operations remain disabled
  until independent validation (see `docs/decisions/0007-trust-module-gate.md`).
