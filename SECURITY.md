# Security Policy

Veyra is an Australian legal-practice operating system. Confidentiality, tenant isolation and
auditability are core requirements. We welcome coordinated reports from security researchers.

## Supported versions

| Version | Supported |
| --- | --- |
| `main` | Yes |
| Older commits, forks and demo snapshots | No |

There is no production release yet. The repository is a development foundation; see the
[README limitations](README.md#limitations). Only the latest `main` branch is maintained.

## Reporting a vulnerability

Do not open a public issue, pull request or discussion for a suspected vulnerability.

Use GitHub's private vulnerability reporting:

1. Open <https://github.com/wicked-media/Veyra/security/advisories/new>.
2. Describe the issue, affected commit or area, and impact.
3. Include minimal reproduction steps and any suggested remediation.

If private reporting is unavailable, open a minimal public issue asking the maintainers to establish
a private channel. Do not include vulnerability details or sensitive data in that issue.

Please include:

- the affected commit, route, service or component;
- preconditions and reproduction steps;
- observed impact, including whether data from another tenant or matter is exposed;
- relevant logs or screenshots with secrets and personal data removed.

## Test data and privacy

Use synthetic data only. Do not access, modify or retain data belonging to another person, firm or
matter. If you encounter real client, personal or privileged information, stop testing and report the
exposure privately without copying the data.

## In scope

- authentication, sessions, OIDC, cookies and CSRF/origin controls;
- tenant isolation, matter access, ethical walls and restricted matters;
- document upload, storage, scanning, download and version authorization;
- append-only audit integrity;
- AI retrieval boundaries, prompt-injection handling and citation authorization;
- server-side injection, SSRF, path traversal, unsafe file handling and secret exposure;
- authorization bypasses in REST routes and server actions.

## Out of scope

- vulnerabilities in third-party dependencies or services; report them upstream and tell us if
  Veyra's use creates a Veyra-specific issue;
- the documented missing production integrations: a real OIDC issuer, encrypted object storage, a
  malware scanner, OCR and a production AI provider;
- the public synthetic demo credentials;
- social engineering, physical access and denial-of-service testing;
- missing compliance certification or legal correctness;
- automated scanner output without a reproducible security impact.

## Disclosure and remediation

We will investigate reports through the private advisory and coordinate disclosure with the reporter.
We do not promise a bug bounty or a fixed response time. Please allow a reasonable remediation period
before public disclosure. We may credit reporters in the advisory unless they prefer to remain
anonymous.

This policy covers the source repository and any preview environment. It does not claim that Veyra is
production-ready, compliant or certified.

Last updated: 9 November 2026.
