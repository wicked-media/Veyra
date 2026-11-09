# Runbook — backup and restore

> No production backup has been performed or restored in this repository. This is the required
> procedure, not evidence of readiness. A backup is only trustworthy after a successful test restore.

## Scope

- PostgreSQL: organisations, users, memberships, clients, matters, tasks, audit.
- Future object storage: documents and versions, encrypted separately, versioned and protected from
  deletion.
- Encryption keys and secrets: managed by the cloud secret/key service, backed up under provider
  controls — never copied into an application backup file.
- Configuration and infrastructure definitions: version-controlled; secrets excluded.

## Production backup design (required)

| Control | Requirement |
| --- | --- |
| Automated backups | Provider-managed daily snapshots plus continuous WAL/PITR |
| Retention | Per firm/legal retention policy; audit retention independent |
| Encryption | At rest, provider-managed keys; access restricted |
| Isolation | Backups in a separate account/project or protected vault |
| Immutability | Object lock/immutable retention where available |
| Monitoring | Backup failures alert; restore verification scheduled |
| Access | Break-glass only, MFA, audited |

Document the actual RPO/RTO after a restore test; do not promise a target before measuring.

## Restore drill

1. Declare a non-production restore window and incident/change reference.
2. Provision a clean, isolated PostgreSQL instance with no public access.
3. Restore the chosen snapshot (or PITR to a timestamp) using the provider's documented procedure.
4. Run migrations only if the restored schema is behind and the plan is approved.
5. Verify:
   - organisation/user/membership counts,
   - matter and client counts per firm,
   - audit row count and latest timestamps,
   - audit triggers reject mutation,
   - sample matter access and wall behaviour,
   - application health against the restored DB in an isolated environment.
6. Record actual restore time, data-loss window and discrepancies.
7. Destroy the restored environment securely after verification, or keep it isolated per policy.

## Disaster recovery

- Application images are reproducible from the commit and lockfile; keep image digests.
- Recreate the database from backup/PITR, then start one app instance and the worker.
- Rotate database credentials and provider tokens if compromise is suspected.
- Re-run smoke tests and audit verification.
- Communicate status and any data loss honestly; follow the incident runbook.

## Audit preservation

`audit_events` is append-only in normal operation. A restore may roll it back to the restore point;
record that fact. Never "fix" audit history by editing rows. Export a signed copy of audit evidence
when required for an investigation, and document chain of custody.

## Future documents

Object storage must use versioning and retention/legal hold. Restores must preserve object versions
and metadata, not just latest bytes. Document keys and database references must be verified together.
