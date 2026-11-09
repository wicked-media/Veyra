# Veyra module catalogue

All modules share one identity system, client database, matter model, permission framework, audit
trail and design language. A module may add tables and workflows; it must not create a second client
or matter store.

Status key: **Implemented** · **Foundation** (partial, secure core only) · **Specified** · **Locked**
(deliberately cannot operate) · **Future**.

| # | Module | Purpose | Stage | Status | Key dependencies |
| --- | --- | --- | --- | --- | --- |
| 1 | Veyra Practice | Firm, offices, people, roles, settings, audit | 1 | Foundation | Identity, database, permissions |
| 2 | Veyra Clients | CRM, intake, contacts, conflicts, KYC | 2 | Foundation | Conflicts workflow, identity verification |
| 3 | Veyra Matters | Matter workspace, teams, parties, tasks, activity | 2 | Foundation | Clients, permissions, walls |
| 4 | Veyra Docs | Private documents, versions, metadata search, authorised downloads | 3 | Foundation | Production object storage, malware scanning, OCR |
| 5 | Veyra AI | Matter-scoped Q&A, citations, approval proposals | 4 | Foundation (production gated) | Documents, permissions, AI provider, evals |
| 6 | Veyra Research | Licensed legislation and case law | 6 | Specified | Research provider agreements |
| 7 | Veyra Connect | Microsoft 365, Google, email, calendar, SMS | 5 | Specified | Graph/Google OAuth, sync infrastructure |
| 8 | Veyra Workflow | Configurable workflows, approvals, escalations | 7 | Specified | Matters, tasks, documents, notifications |
| 9 | Veyra Calendar | Hearings, events, deadline records, human verification | 3 | Foundation | Verified court rules, Microsoft 365 |
| 10 | Veyra Accounts | Time, expenses, invoices, GST, debtors | 6 | Specified | Exact money arithmetic, Xero/MYOB |
| 11 | Veyra Trust | Legal trust ledgers and reconciliation | 9 | **Locked** | Specialist review, independent validation |
| 12 | Veyra Portal | Client authentication, documents, messages, invoices | 7 | Specified | Client identity, e-signature, payments |
| 13 | Veyra Conveyancing | Property transactions and settlement | 8 | Specified | PEXA approval, title/search providers |
| 14 | Veyra Litigation | Pleadings, evidence, chronologies, counsel | 8 | Specified | Documents, calendar, court rules |
| 15 | Veyra Family | Parenting, property, disclosure, sensitive access | 8 | Specified | Litigation foundation, sensitive controls |
| 16 | Veyra Criminal | Charges, bail, briefs, disclosure, legal aid | 8 | Specified | Litigation foundation, confidentiality |
| 17 | Veyra Estates | Wills, probate, estate administration | 8 | Specified | Documents, templates, physical custody |
| 18 | Veyra Commercial | Contracts, entities, due diligence, obligations | 8 | Specified | Documents, workflow, templates |
| 19 | Additional practice areas | Employment, PI, debt, migration, etc. | 8+ | Future | Configurable practice-area framework |
| 20 | Veyra Insights | Firm BI, profitability, compliance reporting | 2/6 | Foundation | Time/billing data for financial metrics |
| 21 | Veyra Admin & Compliance | Conflicts, KYC, retention, legal hold, incidents | 2/7 | Foundation | Audit, documents, policy workflows |

## Module detail

### 1. Veyra Practice

Implemented: organisation profile, time zone, financial year, matter prefix, offices/departments in
the schema, membership invitations, role assignment, session security, audit viewer, admin overview.

Next: custom fields, matter types, numbering rules per type, announcements, staff availability,
access reviews, subscription management.

### 2. Veyra Clients

Implemented: individuals and organisations, contacts, addresses, risk rating, source, notes, matter
list, activity, archive flag, tenant-scoped search.

Next: duplicate detection, conflict-check records with human decisions, engagement letters, costs
disclosure, KYC/AML workflow, intake forms, client lifecycle and retention. **Conflict checks are
records for human review, not automatic legal clearance.**

### 3. Veyra Matters

Implemented: matter numbering, practice area, type, stage, responsible solicitor, team, parties,
restricted flag, tasks, audit timeline, status transitions, access-aware lists and dashboard.

Next: matter tabs for documents, correspondence, calendar, time, billing, workflow and AI; matter
templates; closure checklists; reopening; export; access management UI for teams and walls.

### 4. Veyra Docs

Implemented foundation: matter-scoped private storage abstraction (local filesystem in development),
immutable versions, SHA-256 integrity metadata, PDF/DOCX/image signature validation, a malware-scan
hook with production fail-closed behaviour, metadata/text search, chunk creation for text formats,
authorised and audited downloads, archive state and matter tabs.

Still required: durable encrypted object storage, real malware service, OCR/PDF/DOCX extraction,
preview, folders/tags, comparison, templates, retention/legal hold and secure external sharing.
Rules: never silently alter an original; every download is authorised and audited.

### 5. Veyra AI

Implemented foundation: provider abstraction, a development-only extractive preview, OpenAI JSON
provider support behind a server-side key, matter-scoped chunk retrieval, citation validation,
prompt-injection framing, rate limits, persisted threads/messages and task-only proposals requiring
a different authorised human to approve. Production AI is disabled without a key; no silent mock.

Still required: external evaluation thresholds, provider data-processing approval, shared rate
limits/cost controls and broader adversarial testing. See [the AI architecture](../architecture/ai.md).

### 6. Veyra Research

Specified: licensed Australian legislation and case law, jurisdiction/court filters, saved
authorities, matter links, firm knowledge, citation verification and change monitoring. No scraping
of restricted databases.

### 7. Veyra Connect

Specified: Microsoft Graph (Outlook, calendar, contacts, OneDrive/SharePoint, Teams), Google
Workspace, email-to-matter filing, shared mailboxes, templates, SMS, webhooks and sync diagnostics.
Every connector requires least-privilege scopes, token encryption and monitoring.

### 8. Veyra Workflow

Specified: versioned workflow templates, stage automation, conditional tasks, approvals, reminders,
assignments, document/email triggers, escalations and reporting. High-risk actions require approval.

### 9. Veyra Calendar

Implemented foundation: firm and matter events, deadline categories, explicit human verification
with verifier/time, status changes, timezone-safe datetime-local conversion, wall-aware queries and
audit. Veyra does not calculate limitation or procedural dates automatically.

Still required: reminders, conflict detection, verified/versioned court rule sets and Microsoft 365
sync. Legally consequential deadlines always require human confirmation — never AI alone.

### 10. Veyra Accounts

Specified: timers, billable/non-billable time, rates, fixed fees, retainers, disbursements, draft
and approved invoices, GST, credit notes, payments, debtors, write-offs, profitability, utilisation,
Xero/MYOB exports. Money uses integer minor units; no floating-point arithmetic.

### 11. Veyra Trust — locked

Specified for future double-entry trust ledgers: immutable posted transactions, client/matter
balances, controlled receipts and payments, reconciliation, journals, reversals, statements,
separation of duties and external examination support.

**Release gate:** no operational trust code is enabled until independent legal accounting review and
jurisdiction-specific validation. Software tests do not establish compliance. See
[ADR 0007](../decisions/0007-trust-module-gate.md).

### 12. Veyra Portal

Specified: client authentication and MFA, matter status, secure uploads, messages, questionnaires,
document approvals, e-signature, appointments, invoices and payments. Portal users must never see
internal notes, privileged documents or unrelated matters.

### 13–18. Practice areas

Conveyancing (PEXA/title integration, settlement milestones), litigation (pleadings, evidence,
chronology, counsel), family (parenting, property, disclosure), criminal (charges, bail, briefs,
legal aid), estates (wills, probate, estate assets, physical custody) and commercial (contracts,
entities, due diligence, obligations) all use the shared core. Each adds configurable matter types,
checklists, fields, templates and reports.

### 19. Additional practice areas

Employment, personal injury, workers compensation, debt recovery, insolvency, migration,
administrative, IP, tax, environmental, planning, construction, insurance, defamation, consumer,
regulatory and in-house legal operations are supported by the same framework — no duplicate cores.

### 20. Veyra Insights

Implemented: matter and client aggregates, practice-area/status/responsible breakdowns, visibility-
aware totals. Specified: revenue, unbilled work, utilisation, realisation, ageing, acquisition,
referrals, custom reports, scheduled exports and AI-assisted interpretation.

Financial reports stay absent until billing is implemented and validated.

### 21. Veyra Admin & Compliance

Implemented: roles, audit, permission matrix, firm settings, security controls.

Specified: compliance dashboard, conflict register, KYC/AML workflow, risk assessments, costs
disclosure records, engagement management, retention and legal hold, access reviews, incidents,
policy acknowledgements, security alerts, backups, integration health, exports and deletion subject
to obligations.

## Cross-cutting requirements

- Every record is tenant-scoped; every matter record passes the visibility choke point.
- Every consequential mutation writes audit history in the same transaction.
- Every module has an explicit disable/not-configured state; no fake success.
- Every integration is least-privilege and monitored.
- Every practice-area module is configuration plus focused records — not a fork.
