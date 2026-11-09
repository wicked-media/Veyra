# ADR 0008: Stage 3/4 foundations and production gates

**Status:** Accepted for the development foundation; production release not approved.

## Context

Veyra needed private matter documents, a calendar/deadline record, production-grade identity and a
controlled AI research surface. The threat model requires server-side tenant isolation, ethical
walls, append-only audit, no public document URLs, no autonomous AI actions and no development auth
bypass in production.

## Decision

1. **Documents.** Use a storage interface with a private local-filesystem adapter for development.
   Versions are immutable; metadata and text chunks are matter-scoped; downloads are authorised and
   audited; malware scanning is a provider hook. Production uploads fail closed without a scanner.
2. **Calendar and deadlines.** Store events and deadlines separately. A deadline starts unverified
   and requires an explicit human verification action with verifier and timestamp. Veyra does not
   calculate limitation or procedural dates automatically.
3. **Identity.** Production always resolves to OIDC, even if local mode is requested. Use
   authorization code + PKCE, one-time server transactions, JWKS/ID-token verification, verified
   email and MFA assurance claims. Local passwords remain development-only and OIDC never
   auto-provisions an account.
4. **AI.** Use a provider-neutral boundary. Development may use a clearly labelled extractive
   preview; production is disabled without a configured provider key and never falls back to a mock.
   Retrieval is matter- and wall-scoped, citations are validated against the exact supplied chunks,
   source text is untrusted data, and AI may only propose a `create_task` action. A different human
   with the task permission must approve it.

## Consequences

- The application is demonstrable end-to-end with synthetic data and passing tests.
- Production still requires encrypted durable object storage, a real malware service, OCR,
  independent OIDC integration testing, AI evaluations/data-processing approval, retention and
  legal-hold design, monitoring and restore evidence.
- Passing tests do not establish regulatory compliance or legal correctness.
