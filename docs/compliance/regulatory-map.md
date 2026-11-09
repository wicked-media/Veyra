# Regulatory and compliance map

> **No certification or compliance claim.** This document maps design intentions to Australian
> obligations so the team can obtain qualified review. It is not legal advice. Veyra has not been
> independently audited, certified or approved by any regulator, law society or accounting body.

## 1. Australian Privacy Principles (APPs)

The Privacy Act 1988 (Cth) and APPs apply where Veyra handles personal information. Design responses:

| APP | Design response | Status |
| --- | --- | --- |
| APP 1 — open and transparent management | Privacy policy, data map, retention schedule | Not written |
| APP 2 — anonymity/pseudonymity | Not always practicable for legal identity; assess per workflow | Future |
| APP 3 — collection of solicited personal information | Minimum client fields; intake consent design | Partial |
| APP 4 — unsolicited personal information | Deletion/assessment workflow | Future |
| APP 5 — notification | Collection notices at intake | Future |
| APP 6 — use/disclosure | Matter-scoped access, purpose limitation, no sale | Architecture supports; policy needed |
| APP 7 — direct marketing | No marketing use of client data | Policy |
| APP 8 — cross-border disclosure | Provider/data-residency assessment before integrations/AI | Future |
| APP 9 — government identifiers | Do not use as general identifiers; store only where necessary | Design |
| APP 10 — quality | Validation, correction workflows | Partial |
| APP 11 — security | Tenant isolation, encryption, access control, audit, backups | Partial (see gaps) |
| APP 12 — access | Client data export | Future |
| APP 13 — correction | Correction workflow and audit | Future |

Production requires a privacy impact assessment, a public privacy policy, a data map, retention
schedule, subprocessor list and vendor terms.

## 2. Notifiable Data Breaches (NDB)

Design for detection, assessment, containment and notification:

- Audit and auth events provide investigation evidence; alerting is not yet implemented.
- Incident response runbook exists ([link](../runbooks/incident-response.md)).
- Eligibility assessment (serious harm, likely risk) must be made by the firm with legal advice.
- The OAIC notification timeline and affected-individual notification must be documented.
- Do not promise a notification outcome in advance.

## 3. Solicitor confidentiality and legal professional privilege

- All matter content is treated as confidential by default.
- Matter-level permissions and ethical walls restrict access; walls beat seniority.
- Audit records access and changes.
- AI, email filing and document sharing must not broaden access or waive privilege.
- Privilege claims are a legal determination; the product records assertions and access, not a
  guarantee.
- Support staff access must be restricted, logged and approved; no "just look" bypass.
- Client portal content must be segregated from internal notes and privileged material.

## 4. Legal practice regulation and professional conduct

Veyra is a tool; the firm and its solicitors remain responsible for professional obligations.
Design supports conflict records, costs disclosure, confidentiality, supervision, trust separation
and record keeping. It does not automate professional judgment. Each state/territory has different
rules; NSW is the initial design target, not a claim of coverage.

## 5. Costs disclosure and engagement

Future client/matter records must capture:

- engagement terms and scope,
- costs disclosure and any variations,
- billing method (hourly, fixed, retainer),
- client approval and acknowledgements,
- who provided the disclosure and when.

These are records for human compliance, not auto-generated legal advice. No implementation exists.

## 6. Trust accounting

Trust accounting is **locked** (Stage 9). Australian trust account rules differ by jurisdiction and
require strict controls: client/matter ledgers, receipts/payments, reconciliation, audit, separation
of duties, external examination and retention.

No operational trust code is enabled. Passing tests would not demonstrate compliance. Release
requires a qualified legal accountant, independent validation and jurisdiction-specific sign-off.
See [ADR 0007](../decisions/0007-trust-module-gate.md).

## 7. AML/CTF and client identification

Where obligations apply, design supports:

- client identity verification records and source of funds/wealth,
- risk assessments and enhanced due diligence,
- beneficial ownership for organisations,
- sanctions/PEP screening via approved providers (future),
- suspicious matter consideration and record keeping,
- human review and escalation.

No KYC/AML integration exists. The firm remains responsible for its AML/CTF program. Do not claim
compliance.

## 8. Records retention

- Retention periods depend on jurisdiction, matter type and professional rules; no universal period
  is asserted.
- Design: archival rather than hard deletion; legal hold; audit retained independently; documented
  disposition with approval.
- Physical original documents (wills, deeds) require separate custody tracking — planned for estates.
- Client deletion requests must be assessed against retention obligations and legal holds.

## 9. Electronic transactions and signatures

Electronic signature requirements depend on the document, jurisdiction and provider. Future
e-signature integration must record identity, consent, intent, document integrity and audit trail.
It must not be used where law requires witnesses or specific formalities without a compliant flow.

## 10. AI and automated decision-making

- AI is assistance, not final legal advice.
- No autonomous consequential decisions; human approval is required.
- Legal research must cite verifiable sources.
- Confidential data must not be sent to a provider without approved terms and security controls.
- Evaluate for bias, accuracy and hallucination; keep evaluation records.
- Consider privacy, cross-border disclosure, consumer law and professional obligations before launch.

## 11. Security and outsourcing

Production requires:

- Australian-region hosting where available; assess remaining cross-border transfers.
- Encryption in transit and at rest; key management.
- Vendor due diligence and data-processing agreements.
- Access reviews, vulnerability management, incident response and business continuity.
- Independent penetration test and privacy impact assessment.
- Backup restoration evidence.

## 12. Claims policy

Do not state or imply that Veyra is "compliant", "certified", "approved", "secure" in an absolute
sense, or that it provides legal advice. Use precise language: designed to support, subject to
configuration and independent review. Engineering tests are evidence of behaviour, not a regulatory
determination.

## 13. Required reviews before production

1. Australian privacy lawyer: APPs, NDB, cross-border, retention.
2. Legal practice/ethics reviewer: confidentiality, conflicts, costs disclosure, privilege.
3. Legal accountant: trust accounting (Stage 9).
4. Security assessor: penetration test, architecture review, cloud configuration.
5. Identity/access reviewer: OIDC, MFA, joiner/mover/leaver, support access.
6. Insurance/cyber review: incident response and notification.
