# Veyra — Product Requirements Document

**Version:** 0.1 (Stage 1 baseline)  
**Market:** Australia; initial jurisdiction New South Wales  
**Status:** Foundation implemented; later modules specified, not built

## 1. Problem

Small and mid-sized Australian law firms run on a patchwork of practice management, document
storage, email, calendars, accounting, research and ad-hoc AI tools. The consequences are duplicated
client records, inconsistent matter access, fragile deadline tracking, unclear audit history,
re-keying between systems and confidentiality risk when staff work around the tools.

Existing platforms are capable but often fragmented, dated or inflexible. Veyra's opportunity is a
single, modern, AI-native operating system in which identity, clients, matters, permissions, audit
and documents are shared by every module.

## 2. Vision

A firm can run its entire practice through Veyra: administration, client intake, matters,
documents, research, AI assistance, communications, deadlines, billing, trust accounting, client
collaboration, reporting and integrations — with the right person seeing the right information at
the right time, and every consequential action auditable.

## 3. Principles

1. **One platform, one core.** No duplicate client or matter systems per practice area.
2. **AI-native, human-controlled.** AI assists; authorised people decide, sign, file and pay.
3. **Australian-first.** Terminology, jurisdictions, court practice, GST, trust and privacy.
4. **Security by design.** Tenant isolation, matter permissions and walls are foundational.
5. **Reliability over flourish.** Correct data, recoverability and auditability before features.
6. **Configurable without code.** Matter types, fields, workflows, templates and reports.
7. **Data ownership.** Documented exports in usable formats.
8. **Honest interfaces.** No fake integrations, data or compliance claims.

## 4. Personas

| Persona | Primary needs |
| --- | --- |
| Sole practitioner | Fast intake, matter workspace, documents, deadlines, billing, low admin |
| Small firm principal | Oversight, access control, profitability, risk and compliance |
| Solicitor | Matter work, documents, correspondence, research, time, collaboration |
| Paralegal | Document and task support without financial or privileged access |
| Firm administrator | Users, roles, settings, integrations, audit and policy compliance |
| Accounts / practice manager | Time, billing, debtors, trust controls (future) |
| Client (future portal) | Status, secure documents, messages, approvals, invoices |
| External counsel (future) | Scoped briefs and document exchange |

## 5. Jobs to be done

- Open a matter with a correct, unique reference and the right team.
- Keep confidential matters invisible to people who should not know they exist.
- Find everything about a client or matter in one place.
- Never miss a court date, filing deadline or limitation date.
- Draft from firm precedents without corrupting originals.
- Record time and bill accurately with GST.
- Answer "what is happening in the firm?" without exporting spreadsheets.
- Prove who accessed or changed what, when and why.
- Adopt AI without leaking confidential material or relying on invented law.

## 6. Functional scope by domain

### 6.1 Foundation (implemented)

- Multi-tenant firms, offices, departments.
- Users, invitations, six roles and 37 permissions.
- Server-side sessions, forced password replacement, rate limiting.
- Matter-level access, restricted matters and ethical walls.
- Append-only audit with a visible, permission-filtered log.
- Clients, contacts, addresses, matters, parties, teams, tasks, activity.
- Firm dashboard, matter counts, simple reporting.
- REST API with OpenAPI 3.1 and same-origin protection.
- Responsive application shell, command palette and dark mode.

### 6.2 Specified next

- **Documents:** private object storage, versions, previews, OCR, search, templates, approvals,
  retention, legal hold, e-signature.
- **Calendar:** court dates, deadlines, limitation dates, reminders and Microsoft 365 sync.
- **AI:** matter-scoped RAG, summaries, Q&A, drafting, provenance, evaluations, audit and human
  approval.
- **Communications:** Outlook and Microsoft Graph filing, attachments, calendar, templates.
- **Accounts:** time, disbursements, invoices, GST, debtors, profitability, Xero/MYOB.
- **Trust:** double-entry ledgers, controlled posting, reconciliation, statements; gated.
- **Workflow and portal:** configurable steps, checklists, approvals, client authentication and
  messaging.
- **Practice areas:** commercial, estates, litigation, family, conveyancing, criminal and others
  through shared configuration, not duplicated cores.
- **Insights:** matter ageing, utilisation, realisation, custom reports and scheduled exports.

### 6.3 Explicitly out of scope for the initial release

- Operational trust accounting before independent validation.
- Autonomous AI legal advice, court filing or payments.
- Unlicensed scraping of legal databases.
- Real client data in development or demonstration environments.
- Multi-jurisdiction court rules without verified, versioned sources.
- A mobile native application.

## 7. Non-functional requirements

| Requirement | Target |
| --- | --- |
| Tenant isolation | No cross-firm read or write, enforced server-side and tested |
| Matter confidentiality | Walls and restrictions deny reads and writes; 404 on denial |
| Auditability | Consequential changes recorded append-only with actor, time and context |
| Availability | 99.9% target for production (not yet measured) |
| Recovery | Documented backup/restore with tested RPO/RTO before launch |
| Performance | Interactive pages under 2s at p95 for a 50-user firm (not yet measured) |
| Accessibility | WCAG 2.2 AA target; keyboard-first navigation |
| Browser support | Current Chrome, Edge, Firefox and Safari |
| Data portability | Documented exports for clients, matters, documents and audit |
| Localisation | `en-AU`, Australia/Sydney default, configurable time zone |
| Privacy | Data minimisation, retention, access review, deletion subject to obligations |

## 8. Success metrics

- Time from client enquiry to opened matter.
- Percentage of matters with a current team and next action.
- Overdue task and deadline rate.
- Unbilled work and aged debtors (once billing exists).
- Document retrieval time and version integrity.
- AI suggestion acceptance and citation-validity rate (once AI exists).
- Security: zero cross-tenant findings in tests and independent assessment.
- Adoption: weekly active users per firm and matters touched per user.

## 9. Constraints and dependencies

- Australian legal and accounting review is required before production claims.
- Microsoft Graph, Xero, MYOB, PEXA, legal research and e-signature access depend on commercial
  agreements and provider approval.
- Managed OIDC and MFA require an identity provider decision.
- Production hosting should use Australian regions where available.
- No feature may depend on a development-only adapter in production.

## 10. Release acceptance (Stage 1)

Stage 1 is accepted only when:

1. A user can sign in, change a temporary password, and reach a permission-filtered shell.
2. A firm can invite members and assign roles with server-side enforcement.
3. Clients and matters persist with audit events.
4. Restricted matters and ethical walls deny reads and writes with tests.
5. Cross-tenant access attempts fail with 404/403 as appropriate.
6. Audit records cannot be updated, deleted or truncated.
7. API and UI typecheck, lint and tests pass.
8. Documentation covers architecture, security, compliance, API and operations.

Known exceptions are recorded in the README and final delivery report.

## 11. Open decisions

- Identity provider and MFA rollout.
- Production object storage provider and Australian region.
- Document preview/OCR vendor vs self-hosted.
- Legal research provider licensing.
- Accounting integration priority (Xero vs MYOB).
- Practice-area order after validated customer demand.
- Retention schedule per matter type and jurisdiction.
- AI provider data-processing terms and evaluation dataset ownership.
