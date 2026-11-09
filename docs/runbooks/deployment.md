# Runbook — deployment

> Stage 1 is not approved for production client data. Use this runbook for controlled staging until
> independent security, privacy and legal review is complete.

## Target topology

- Managed PostgreSQL in an Australian region, private networking, encryption, automated backups/PITR.
- One or more Next.js instances behind a TLS-terminating load balancer.
- The worker as a separate process/container.
- Secrets in a managed secret store, injected at runtime.
- Object storage, email and integrations are not part of Stage 1.

## Required environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | `production` |
| `VEYRA_APP_URL` | Yes | Public HTTPS origin, e.g. `https://app.veyra.example`; used for secure cookies and origin checks |
| `DATABASE_URL` | Yes | Managed PostgreSQL; TLS as required by the provider |
| `VEYRA_AUTO_SEED` | No | Must not seed in production; leave unset/false |
| `VEYRA_WORKER_INTERVAL_MS` | No | Default 15 min, minimum 60 s |
| Provider keys | No | Stage 1 has no active integration/AI; do not add unused secrets |

No secret belongs in the image, build args, logs or source. Use the platform's secret manager and
rotation process.

## Release procedure

1. **Build and test** the exact commit: `pnpm install --frozen-lockfile`, `pnpm verify`, `pnpm build`.
   Keep logs and the commit SHA.
2. **Back up** PostgreSQL and confirm the backup completed. For schema changes, review the migration
   and rollback plan.
3. **Run migrations as a dedicated job** (not concurrently across app instances):
   `pnpm db:migrate`. Capture output and exit status.
4. **Deploy the application** with the new image. Start with one instance for a canary where possible.
5. **Deploy the worker** with the same image/commit.
6. **Check health** `GET /api/health` returns 200 `{ "status": "ok" }`.
7. **Smoke test**: sign-in, dashboard, matter list, create a synthetic test matter/client in a
   non-production environment, sign-out. Check audit records.
8. **Observe** error rate, latency, DB connections and logs. Roll forward or roll back deliberately.

## Rollback

- Application: redeploy the previous image digest.
- Database: prefer forward-compatible migrations; if a rollback is required, use the reviewed
  down-plan and a verified backup. Never restore over production without an incident decision.
- Worker: redeploy the previous digest.
- Record the rollback and cause.

## TLS and cookies

Set `VEYRA_APP_URL` to the exact HTTPS origin. Cookies are `Secure` on HTTPS, in production for
non-localhost HTTP, and localhost development remains usable over HTTP. Never disable TLS for real
client data. Ensure the proxy forwards the original `Origin` header unchanged.

## Health and monitoring

- `/api/health` is a database readiness probe, not a full synthetic transaction.
- Alert on: 5xx rate, health failures, DB connection saturation, migration failure, worker absence,
  sign-in failure spikes, audit write failures.
- Centralise logs with request ids; never log passwords, tokens, cookies or full request bodies
  containing personal information.
- Add uptime monitoring from outside the cluster.

## First-production checklist (not yet satisfied)

- [ ] Managed OIDC + MFA replaces the local credential adapter.
- [ ] Independent penetration test and privacy impact assessment.
- [ ] Restore drill with measured RPO/RTO.
- [ ] Shared rate limiting and session revocation across instances.
- [ ] CSP, monitoring, alerting and on-call runbook.
- [ ] Legal review: privacy, confidentiality, retention, costs disclosure.
- [ ] Data-processing agreements for hosting and any provider.
- [ ] No demo data; seed disabled and verified.
- [ ] Trust and AI remain disabled.
- [ ] Incident response contacts and NDB assessment process tested.

## Docker (local/staging only)

`infrastructure/docker/docker-compose.yml` builds the app, runs migrations, seeds a synthetic demo
firm, starts PostgreSQL, the app and the worker. It is a local demonstration environment, not a
production deployment. Do not expose it to the internet or load real data.

## Known Stage 1 deployment limitations

- Startup migrations run in the app; production must use a dedicated migration job.
- No horizontal-session or rate-limit sharing yet.
- No object storage, email delivery or provider integrations.
- No automated backup evidence or disaster-recovery test has been performed in this repository.
