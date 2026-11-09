# Runbook — security incident response

> This runbook is a starting point, not legal advice. Notification decisions require the firm,
> privacy counsel and regulators as applicable. Do not promise an outcome before assessment.

## Severity

| Level | Examples | Target response |
| --- | --- | --- |
| SEV1 | Confirmed cross-tenant access, credential compromise, audit destruction, ransomware | Immediate; incident lead and executive notified |
| SEV2 | Suspicious privileged activity, isolated auth bypass, data exposure risk | Within 1 hour |
| SEV3 | Failed intrusion attempt, dependency vulnerability with no exploitation | Same business day |
| SEV4 | Policy violation, low-risk misconfiguration | Planned remediation |

## Roles

- **Incident lead:** coordinates, decides, owns communications.
- **Security/engineering:** containment, forensics, recovery.
- **Privacy/legal:** NDB assessment, privilege, notification.
- **Firm liaison:** informs affected firms; does not speculate.
- **Scribe:** timeline and decisions.

Assign named people and out-of-band contacts before production. Do not rely on the compromised
system for communication.

## Steps

1. **Detect and record.** Capture alert, request ids, timestamps and reporter. Start a timeline.
2. **Triage.** Confirm scope: which firms, users, matters, data and systems. Preserve evidence before
   changes (logs, database snapshots, relevant audit rows).
3. **Contain.** Revoke sessions/tokens, disable a compromised account or connector, isolate an
   instance, block an IP, rotate credentials. Use the least destructive action that stops harm.
4. **Eradicate.** Remove the cause: patch, configuration fix, dependency update, key rotation.
5. **Recover.** Restore from verified backup if needed, validate integrity, monitor closely.
6. **Assess privacy.** Determine whether personal information was accessed/disclosed and whether
   serious harm is likely. Follow the Notifiable Data Breaches scheme with legal advice; document the
   decision even if notification is not required.
7. **Notify.** Firm(s), insurers, regulators and affected individuals as required and approved.
   Communications must be factual and avoid speculation or admissions.
8. **Post-incident.** Root cause, control gaps, tests added, owners and deadlines. Update the threat
   model and runbooks.

## Evidence to preserve

- Audit events and authentication logs around the window.
- Application/provider logs with request ids; protect confidentiality.
- Database snapshots and relevant row history where lawful.
- Access-review and change records.
- Chain of custody for exports; hash where practical.

Do not delete suspicious accounts or records until evidence is secured and legal advises.

## Specific scenarios

- **Cross-tenant suspicion:** identify the query/path, freeze deploys, verify with synthetic data,
  notify affected firms and legal; add a regression test.
- **Session compromise:** revoke all sessions for the user/firm, rotate secrets, force password reset,
  inspect audit for actions.
- **Audit tampering attempt:** preserve DB logs, check role/credential misuse, verify triggers,
  restore from a trusted backup if history is corrupted.
- **Dependency compromise:** stop builds/deploys, pin/rollback, scan images, rotate build secrets.
- **Lost device:** revoke sessions, assess downloaded data, follow firm policy.

## Postmortem template

- Summary and severity
- Timeline (detection → containment → recovery)
- Impact (firms, people, matters, data)
- Root cause and contributing factors
- What worked / what failed
- Notification decisions
- Remediation items with owners/dates
- Tests and documentation updated

## Contacts

Fill in before production: incident lead, security, privacy counsel, insurer, cloud provider,
identity provider, after-hours escalation. Do not store these only in this repository if it could be
compromised.
