# Veyra development roadmap

The platform is architected end-to-end but delivered in verified stages. A stage starts only when
its dependencies are secure and tested. A working demo is not a release.

| Stage | Scope | Status | Exit gate |
| --- | --- | --- | --- |
| 0 | Architecture, PRD, module catalogue, data model, matrix, threat model, AI/integration architecture, backlog, ADRs | Complete (this repo) | Documents reviewed; boundaries agreed |
| 1 | Monorepo, shell, database, auth, firms, users, roles, audit, CI, tests | Complete | Typecheck, lint, tests, build; security tests pass |
| 2 | Clients, contacts, matters, workspaces, teams, search, activity, tasks | Foundation complete | Matter lifecycle and access verified; stage 2 acceptance below |
| 3 | Documents, versions, metadata/search, tasks/deadlines, calendar foundation | Implemented foundation; hardening pending | Local private storage, scan hook, version integrity and authorised-download tests pass; production object storage, encrypted volume, OCR and a real malware service remain |
| 4 | AI: chunk retrieval, matter-scoped Q&A, citations, human approval | Controlled foundation; production gated | Retrieval isolation, citation validation and second-person approval tests pass; provider key, external data-processing approval and evaluation thresholds remain |
| 5 | Microsoft 365/Graph, Outlook filing, calendar sync, integration monitoring | Not started | OAuth least privilege, token security, retry/recovery, two-tenant isolation |
| 6 | Time, expenses, invoices, GST, billing reports, payments, exports | Not started | Exact arithmetic, approval separation, reconciliation, accounting export tests |
| 7 | Workflow engine, templates, intake, client portal, messaging, e-signature | Not started | Client isolation, consent, approval audit, portal penetration test |
| 8 | Practice areas: commercial, estates, litigation, family, conveyancing, criminal | Not started | Per-module workflow, access, templates and regulatory review |
| 9 | Advanced accounting, trust ledgers, reconciliation, regulatory reporting | **Locked** | Independent legal accounting validation + jurisdiction approval |
| 10 | Multi-office, enterprise SSO, advanced reporting, marketplace, scale, multi-jurisdiction | Future | Enterprise security review and load/failover evidence |

## Stage 2 acceptance

- A firm can create individual and organisation clients with contacts and addresses.
- A matter receives a unique firm/year reference under concurrency.
- The responsible solicitor and creator are team members; parties and tasks persist.
- Restricted matters and walls deny reads and writes, including for owners.
- Matter, client and task lists are tenant-scoped and wall-aware.
- Audit history records creation and consequential changes.
- Dashboard/insights counts match visibility.
- Cross-tenant and walled-access tests pass.

## Stage 3 acceptance

- Documents stored privately with encryption at rest; no public URL.
- Immutable original versions; check-in/check-out prevents lost updates.
- Downloads authorised by matter access and audited.
- Malware scanning blocks infected files.
- Search returns only documents the actor may read.
- Calendar stores verified deadlines with an explicit human verification record.
- Retention and legal hold design reviewed before production data.

## Stage 4 acceptance

- Retrieval only from matters the user can already open, with per-chunk ACL checks.
- Every AI answer links to source passages; no source, no legal assertion.
- Prompt-injection tests cover documents, email and matter notes.
- Evaluation dataset meets agreed precision/recall and citation-validity thresholds.
- Model/provider abstraction supports a documented allowlist and cost limits.
- AI processing is audited; drafts require human approval to save or send.
- No autonomous filing, advice finalisation, communication or payment.

## Stage 5–10 gates

Each stage requires: threat-model update, permission tests, migration review, audit coverage,
operational runbooks, load/performance measurement where relevant, provider approval, and
independent review for regulated functionality.

## Current recommended assignment

The Stage 3 and Stage 4 foundations are present, but the acceptance gates above are not all met.
Before production: replace local document storage with encrypted private object storage, connect a
real malware scanner, add a PDF/DOCX ingestion worker, configure and independently test the chosen
OIDC issuer with MFA, run the AI evaluation and prompt-injection suite, and complete retention,
legal-hold and restore evidence. Do not treat passing unit/integration tests as a release approval.

## Explicitly deferred

- Trust accounting release.
- AI provider connection.
- Microsoft/Xero/MYOB/PEXA connections.
- Client portal.
- Production use with real client data.
- Compliance certification claims.
