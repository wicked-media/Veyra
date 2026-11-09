# Security threat model

**Scope:** Stage 2 practice-management core, with the Stage 3 documents/calendar and Stage 4
controlled-AI foundations. Document storage, malware scanning, external OIDC and the AI provider are
not production-qualified in this environment. Trust, portal and third-party integrations remain
non-operational. This is a living document; update it with each stage.

## 1. Assets

- Client identity, contact and matter information.
- Legal advice, correspondence and privileged material (future documents/email).
- Ethical-wall and conflict information.
- Credentials, session tokens, OAuth tokens and provider keys.
- Audit history and access records.
- Financial and trust records (future; trust locked).
- Firm configuration, roles and membership.
- Availability and integrity of the service.

## 2. Actors and trust boundaries

| Actor | Trust |
| --- | --- |
| Anonymous internet | Untrusted |
| Signed-in firm member | Authenticated, authorised per request; not trusted to supply tenant/role |
| Firm owner/admin | Privileged for firm settings, but **not** above ethical walls |
| Support/operator | Separate, least-privilege, audited (not implemented) |
| Application server | Trusted code; database credentials are high value |
| Database | Trust boundary; tenant scoping and audit triggers are controls |
| External providers | Untrusted until authenticated; future only |

Boundaries: browser↔app (TLS/cookie), app↔database (private network/credentials), worker↔database,
app↔provider (future OAuth/API), operator↔production (future).

## 3. Priority abuse cases and controls

| # | Threat | Impact | Controls | Status |
| --- | --- | --- | --- | --- |
| 1 | Cross-tenant read/write by changing an id | Confidentiality breach | Every query scoped by actor firm; no client-supplied org/role; tests with two firms; 404 on mismatch | Implemented/tested |
| 2 | Ethical-wall bypass via role, search, audit or task list | Privilege breach | One visibility choke point; wall deny-list; all matter-derived queries reuse it; wall tests including owner/admin | Implemented/tested |
| 3 | Restricted-matter existence disclosure | Confidentiality | Restricted matters require team membership; denied access returns 404 | Implemented/tested |
| 4 | Session theft / fixation | Account takeover | Random 256-bit token, hash at rest, HttpOnly/SameSite/Secure, expiry, revocation, password-change revocation | Implemented/tested |
| 5 | Credential stuffing / brute force | Account takeover | scrypt, dummy hash for unknown users, generic errors, per-IP+email rate limit | Implemented; distributed limit required in production |
| 6 | Privilege escalation via role assignment | Unauthorised control | Server-side permission checks; only owner assigns owner/admin; self-role change blocked; audit | Implemented/tested (partially) |
| 7 | Audit tampering | Loss of evidence | Append-only triggers reject update/delete/truncate; restricted DB role in production | Implemented/tested |
| 8 | CSRF on cookie-authenticated mutations | Unauthorised actions | SameSite=Lax + Origin check on mutating API requests; server actions same-origin by framework | Implemented; extend to all future mutation surfaces |
| 9 | XSS / content injection | Session/data compromise | React escaping; no `dangerouslySetInnerHTML`; CSP not yet configured | Partial |
| 10 | SQL injection | Data breach | Drizzle parameterised queries; Zod validation; no string-concatenated SQL from input | Implemented |
| 11 | Malicious file upload | Malware/RCE | 20 MB cap, MIME/extension/signature checks, UTF-8/control-character checks, private non-web storage, scan hook and production fail-closed; local scanner is only a validation adapter | Implemented/tested; real malware service pending |
| 12 | AI prompt injection / cross-matter leakage | Confidentiality / bad advice | Matter filter before retrieval, wall-aware visibility, trusted system prompt, source delimiters/sanitisation, citation validation against supplied chunks, no tools, task-only human-approved proposals, rate limits | Implemented foundation; external evals pending |
| 19 | AI provider key exposure or silent mock in production | Confidentiality / false assurance | Key server-side only, never returned; production without key is explicitly disabled; development local provider labelled; allowlisted model | Implemented/tested |
| 20 | Replayed OIDC callback / forged identity | Account takeover | State transaction hash, one-time consume, PKCE, nonce/issuer/audience/JWKS verification, verified-email + MFA claims, no auto-provisioning | Implemented/tested at policy level; real IdP test pending |
| 13 | Secret leakage | Full compromise | No secrets in source; env/managed store; key never returned to browser; logs avoid tokens | Partial |
| 14 | Dependency compromise | Supply chain | Lockfile, pinned versions, CI; dependency scanning planned | Partial |
| 15 | Denial of service | Unavailability | Request size limits on API bodies; rate limits on auth; platform protections planned | Partial |
| 16 | Backup loss / ransomware | Data loss | Production backup/PITR design; restore drills; least-privilege DB roles | Not implemented |
| 17 | Insider misuse | Confidentiality | Least privilege,walls, audit, access reviews (future) | Partial |
| 18 | Development bypass in production | Catastrophic | Seed refuses production; demo credentials only local; production runtime must set real auth | Guarded; deployment review required |

## 4. Implemented security controls

- Server-side session resolution on every page/action/API call.
- Organisation isolation in all domain services.
- Matter visibility and walls centralised; 404 on denial.
- Role permission matrix enforced server-side; UI navigation is not a control.
- scrypt password hashing with per-user salt; timing-equalised unknown-user path.
- Session token hashing at rest; cookie flags; forced password replacement; revocation.
- Append-only audit with actor, action, entity, matter, IP/user agent and metadata.
- Zod validation at API boundaries; request body size cap.
- Same-origin enforcement for mutating API requests.
- Generic error responses for unexpected failures; request ids for correlation.
- Security headers: nosniff, referrer policy, restrictive permissions policy.
- No third-party fonts, analytics or AI calls.
- Production demo seed disabled; synthetic `.demo` data only.

## 5. Residual risks and required work

1. **No independent penetration test.** Required before production.
2. **Process-local rate limiting.** Replace with a shared store before multiple instances.
3. **OIDC has not been tested against a real managed issuer.** Configure and independently test MFA,
   discovery, JWKS rotation, callback and logout/expiry behaviour before production. Local
   credentials are development-only and refused when `NODE_ENV=production`.
4. **Document storage is local in development.** Production needs encrypted durable object storage,
   retention/legal hold and backup/restore evidence. PDF/DOCX OCR is not implemented.
5. **No real malware scanner is connected.** Production uploads fail closed without one; the local
   adapter is not an anti-malware service.
6. **AI has no independent evaluation or provider DPA.** Keep production AI disabled until the
   evaluation thresholds, prompt-injection suite, data-processing terms and cost limits are approved.
7. **No CSP.** Add a nonce-based Content-Security-Policy and test it with Next.js.
8. **No database role separation.** The app role should not be able to alter audit triggers; use a
   restricted role and separate migration role.
9. **No structured monitoring/alerting.** Add auth anomaly alerts, audit integrity checks and error
   tracking.
10. **No secrets manager proof.** Deployment must use a managed store with rotation.
11. **No backup/restore evidence.** Schedule and test production restores.
12. **No legal/compliance certification.** Do not claim one.
13. **No account recovery flow.** Design identity proofing; do not add ad-hoc support resets.

## 6. Test coverage map

| Control | Test |
| --- | --- |
| Tenant isolation | `tests/security/authorization.test.ts` |
| Restricted matters and walls (read/write) | `tests/security/authorization.test.ts` |
| Audit/task/dashboard visibility | `tests/security/authorization.test.ts` |
| Password/session handling and revocation | `tests/security/security-controls.test.ts` |
| Rate limiting and generic auth errors | `tests/security/security-controls.test.ts` |
| Audit immutability triggers | `tests/security/security-controls.test.ts` |
| Same-origin, validation, cross-tenant API | `tests/security/security-controls.test.ts` |
| OpenAPI drift | `tests/security/security-controls.test.ts` |
| Permission least privilege | `tests/contracts/catalogue.test.ts` |
| Document upload/download/version/wall isolation | `tests/integration/stage34.test.ts` |
| Deadline verification and calendar access | `tests/integration/stage34.test.ts` |
| AI retrieval, citation validation, approval separation | `tests/integration/stage34.test.ts` |
| OIDC mode, MFA/email verification and nonce policy | `tests/contracts/catalogue.test.ts` |

## 7. Review cadence

Review this model at every stage gate, after any security incident, and before any external
integration, document upload, AI retrieval or trust functionality is enabled. Record accepted risks
with an owner and expiry. Do not silently accept a critical risk.
