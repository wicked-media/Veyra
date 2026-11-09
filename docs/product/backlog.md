# Veyra development backlog

Ordered by dependency and risk. Each item requires tests, audit coverage and documentation before it
is considered done. Items marked **now** are the recommended next assignment.

## Stage 2 completion — practice core

| Priority | Item | Acceptance |
| --- | --- | --- |
| P1 | Matter access management UI | Add/remove team members, apply/remove walls, reason required, audit event; server checks |
| P1 | Conflict-check record | Record parties searched, decision, reviewer, time; human decision only; matter link |
| P1 | Matter close/reopen checklist | Required checklist before close, reopen permission, audit; tests |
| P1 | Client duplicate detection | Normalised name/email/phone matching, review screen, no auto-merge |
| P1 | Matter activity detail | Filter by action and actor, pagination, wall-aware |
| P2 | Matter parties CRUD | Opposing, counsel, related parties with validation and audit |
| P2 | Client contacts/addresses CRUD | Primary contact invariant; audit |
| P2 | Saved views / filters | Persisted per user; no cross-user leakage |
| P2 | Firm announcements / availability | Permissioned, audited, no email dependency |
| P3 | Matter templates | Configurable stages, task checklists and document placeholders |
| P3 | Custom fields | Typed fields per matter type, validated, exported |

## Stage 3 — documents and calendar (**now**)

| Priority | Item | Acceptance |
| --- | --- | --- |
| P1 | Private object storage adapter | S3-compatible, server-side encryption, signed short-lived URLs; no public buckets |
| P1 | Document/version schema and service | Matter-scoped, immutable originals, version history, audit; permission tests |
| P1 | Upload/download security | Size/type limits, malware scan, content-disposition, no path traversal, authorised only |
| P1 | Document list/search | Matter visibility filter, pagination, no cross-matter leakage |
| P1 | Retention/legal-hold foundation | Hold prevents deletion; policy documented; audit |
| P2 | PDF preview and OCR pipeline | Async worker, failure states, no blocking request path |
| P2 | Document templates | Versioned templates, merge fields, output is a new document |
| P2 | Calendar schema and UI | Firm/user/matter events, reminders, visibility |
| P2 | Verified deadline rules | Versioned NSW rules with citation and human confirmation |
| P3 | Microsoft 365 calendar sync | Stage 5 dependency; OAuth and two-way sync conflict handling |

## Stage 4 — AI

| Priority | Item | Acceptance |
| --- | --- | --- |
| P1 | AI policy and audit | Every request records actor, matter, purpose, model, sources and cost |
| P1 | Ingestion and pgvector index | Chunk-level ACLs, matter scope, deletion propagation |
| P1 | Permission-aware retrieval | Tests prove walls/restrictions cannot be crossed |
| P1 | Summaries with citations | Source links or explicit "not found"; no invented authorities |
| P1 | Prompt-injection defence | Document/email content is data, not instructions; adversarial tests |
| P1 | Evaluation harness | Fixed synthetic dataset, citation validity, refusal behaviour |
| P2 | Drafting into editable drafts | Human approval required; no send/file action |
| P2 | Suggested time entries | Review required; no automatic posting |
| P2 | Cost and usage controls | Per-firm limits, alerts, model allowlist |

## Stage 5 — communications

Microsoft Entra ID SSO and MFA decision; Graph OAuth with least privilege; Outlook filing and
attachment capture; calendar sync; shared mailboxes; sync monitoring, retries and dead-letter
handling; tenant-isolated token storage and revocation. No email sending without explicit approval.

## Stage 6 — accounts

Time recording, rates, disbursements, invoices, GST, credit notes, payments, aged debtors,
profitability, Xero/MYOB exports. Integer minor units, rounding rules, approval separation. No
floating point. Financial reports only from validated data.

## Stage 7 — workflow and portal

Versioned workflow engine; approvals and escalations; client authentication/MFA; portal document
sharing and messaging; questionnaires; e-signature integration; client invoice/payment links.
Portal users must never reach internal notes, privileged documents or unrelated matters.

## Stage 8 — practice areas

Commercial → estates → litigation → family → conveyancing → criminal → other areas, based on
validated demand. Each requires matter types, checklists, templates, fields, reports, access rules
and regulatory review.

## Stage 9 — trust (**locked**)

Do not schedule implementation until a qualified legal accountant and independent reviewer are
engaged. Required before any release: double-entry design review, immutability and idempotency,
concurrency tests, reconciliation, separation of duties, jurisdiction rules, external examination
support, documented controls and sign-off. Tests alone are not validation.

## Stage 10 — enterprise

Multi-office administration, enterprise SSO, advanced reporting, integration marketplace, scale and
multi-jurisdiction. Requires load/failover evidence and enterprise security review.

## Platform hardening backlog (ongoing)

- Managed OIDC + MFA replacing the development credential adapter.
- Production PostgreSQL failover, backup and restore drills with measured RPO/RTO.
- Structured logging, tracing, error monitoring and alerting.
- Dependency and container scanning in CI.
- CSP with nonces; review current headers.
- Access review reports and periodic entitlement certification.
- Data export and deletion workflows subject to retention.
- Accessibility audit (WCAG 2.2 AA) and keyboard testing.
- Load testing at 50/200/1000 concurrent users.
- Independent penetration test and privacy impact assessment.
- Legal review of terms, privacy policy, costs disclosure and retention schedules.
