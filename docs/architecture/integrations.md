# Integration architecture

> **Stage 1 status: no connector is active.** `packages/integrations` defines the catalogue and
> credential status. Credentials being present never means a connection exists, and the admin UI
> states that explicitly.

## 1. Catalogue

| Provider | Category | Access | Stage | Notes |
| --- | --- | --- | --- | --- |
| Microsoft 365 / Graph | Email, calendar, contacts, files, Teams | OAuth 2.0 / Entra ID | 5 | Outlook filing, attachment capture, calendar sync, Word/SharePoint |
| Xero | Accounting | OAuth 2.0 | 6 | Invoice export and reconciliation support |
| MYOB | Accounting | OAuth 2.0 | 6 | Accounting export |
| Legal research providers | Research | Commercial licence | 6 | Licensed legislation/case law only |
| Electronic signature | Documents | Provider agreement | 7 | Envelope audit trail, signer verification |
| PEXA | Conveyancing | Commercial/authorised | 8 | Availability must be confirmed |

Google Workspace, SMS, VoIP, payment links and custom webhooks are future additions.

## 2. Common connector contract

Each connector will implement a small, typed interface:

```ts
interface Connector {
  id: string;
  requiredScopes(): readonly string[];
  beginAuthorization(state: OAuthState): Promise<AuthorizationUrl>;
  completeAuthorization(code: string, state: OAuthState): Promise<Connection>;
  refresh(connection: Connection): Promise<Connection>;
  healthCheck(connection: Connection): Promise<HealthStatus>;
  disconnect(connection: Connection): Promise<void>;
}
```

Requirements:

- OAuth `state` is random, single-use, bound to user/session and expires quickly.
- Tokens encrypted at rest with a KMS-managed key; never logged or returned to the browser.
- One connection per firm/provider/account; tokens are tenant-scoped.
- Least-privilege scopes; request incremental consent only when needed.
- Refresh tokens rotated and revoked on disconnect.
- All provider calls server-side, with timeouts, bounded retries and idempotency where supported.
- Provider errors mapped to safe internal errors; no raw tokens or provider payloads in logs.
- Every connection, refresh failure and disconnection is audited.
- Webhooks verified (signature, timestamp, replay protection) before processing.

## 3. Microsoft 365

Planned capabilities:

- Entra ID SSO (replacing the development credential adapter).
- Outlook: file an email and attachments to a matter; create tasks; preserve original message
  metadata and headers.
- Calendar: sync matter/user events both ways with conflict detection and an explicit Veyra
  ownership rule.
- Word/SharePoint/OneDrive: open and save documents while preserving versions; no silent overwrite.
- Teams: optional notifications, not a source of matter truth.

Filing an email must require matter access at the time of filing. An email is confidential content;
it inherits the matter's permissions, walls and retention.

## 4. Accounting (Xero, MYOB)

- Veyra remains the source of truth for time, matters and invoice approval.
- Export invoices/credit notes with GST and contact mapping; store external ids and status.
- Never let an accounting sync overwrite approved invoice totals silently.
- Trust transactions are not exported to ordinary business accounting as a shortcut.
- Reconciliation differences are surfaced, not auto-corrected.

## 5. Legal research

- Only licensed or public sources; no scraping of restricted databases.
- Store citation, provider, retrieval time and source URL/identifier.
- Respect licence terms on storage, display, caching and AI use.
- AI may summarise retrieved passages but may not invent or "fill in" citations.

## 6. Electronic signature and PEXA

Both require commercial approval and authorised access. The code will expose an interface and honest
"not configured" state until a provider agreement exists. Do not imply availability in marketing or
UI before approval. E-signature envelopes must record signer identity, consent, timestamps, document
hash and completion certificate.

## 7. Sync and failure handling

- Durable job records with idempotency keys.
- Exponential backoff with jitter; maximum attempts; dead-letter visibility.
- Per-connection health, last success, error category and retry controls in admin.
- Cursor/watermark storage to avoid duplicate processing.
- Webhook processing deduplicated by provider event id.
- Disconnection and token revocation handled without deleting source matter records.
- Sync never bypasses permissions; a background job acts under a service identity with explicit
  tenant scope and records the originating user where applicable.

## 8. Security and privacy

- Data-processing agreements and subprocessors reviewed before connection.
- Data residency assessed; prefer Australian regions where available.
- Minimum content sent; attachment scanning/quarantine before storage.
- No confidential documents sent to external AI services as part of "integration" without approved
  terms and explicit product design.
- Credential rotation and revocation runbooks.
- Integration access included in access reviews and audit exports.

## 9. Monitoring and testing

Before release, each connector requires:

- OAuth success/failure/cancel/state-tampering tests;
- token encryption and tenant-isolation tests;
- retry, timeout, rate-limit and dead-letter tests;
- webhook signature and replay tests;
- disconnect/reconnect and revoked-token tests;
- two-firm isolation proof;
- documented scopes and data flows;
- an honest status page in administration.

No connector is claimed operational until these checks pass with a real provider sandbox.
