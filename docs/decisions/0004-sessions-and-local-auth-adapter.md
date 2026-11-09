# ADR 0004 — Database sessions now; managed OIDC and MFA for production

- **Status:** Accepted (development adapter)
- **Date:** 2026-11-05

## Context

The platform needs working authentication without external credentials. Legal data demands strong
session security and a clear path to enterprise identity (Microsoft Entra ID, MFA, SSO).

## Decision

Implement a **development** credential adapter:

- scrypt password hashing with per-user salt and tuned parameters.
- Opaque 256-bit session tokens; only SHA-256 hashes stored.
- `HttpOnly`, `SameSite=Lax`, `Secure` where appropriate, 12-hour expiry.
- Forced password replacement for invited accounts.
- Revocation on sign-out and password change; rate limiting on sign-in.

The session and authorisation boundary is designed so an OIDC adapter can replace credential
verification while preserving `Actor` construction and permissions.

## Consequences

- The build is usable locally without external services.
- **It is not production identity.** No MFA, account recovery, SSO, device trust or identity proofing.
- Production must use a managed OIDC provider with MFA and documented recovery; the local adapter
  must not be exposed as the production sign-in method.
- Session storage in PostgreSQL is acceptable for Stage 1; shared rate limiting is still required
  for multiple instances.
