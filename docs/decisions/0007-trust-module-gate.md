# ADR 0007 — Trust accounting is locked until independently validated

- **Status:** Accepted
- **Date:** 2026-11-05

## Context

Australian legal trust accounting is a regulated, high-consequence financial activity. Rules differ
by jurisdiction and require correct ledgers, controlled receipts/payments, reconciliation, audit,
separation of duties and external examination. A software test suite cannot establish compliance.

## Decision

- No operational trust accounting is released in Stages 1–8.
- The `trust:read`/`trust:manage` permissions and the locked page exist only to communicate scope and
  prevent accidental use; there are no trust tables or posting services.
- The UI states that the module is gated and why.
- Stage 9 begins only with a qualified legal accountant and independent reviewer engaged.

## Release gate

Before any trust functionality is enabled:

1. Jurisdiction-specific requirements documented and reviewed.
2. Double-entry ledger design independently reviewed.
3. Immutable posted transactions, idempotency and concurrency proven.
4. Reconciliation, statements, reversals and external examination support tested.
5. Separation of duties and approval controls verified.
6. Backup/restore and disaster recovery tested for trust data.
7. Security assessment and penetration test completed.
8. Written sign-off by the qualified reviewer and firm pilot.

## Consequences

- Veyra will not claim trust accounting capability early.
- Sales/demo material must not imply it is available.
- Any "temporary" trust posting implementation is prohibited; it would create unacceptable legal and
  financial risk.
