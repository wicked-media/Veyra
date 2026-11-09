## Summary

<!-- What problem does this solve, and why is this approach appropriate? -->

## Related issue

<!-- Link the issue, or write "None". -->

## Changes

<!-- Bullet the important changes. Keep the pull request focused. -->

## Security and privacy

<!-- Explain the effect on tenant isolation, ethical walls, authentication, audit, documents, AI boundaries or data handling. Write "No security boundary changed" if that is accurate. -->

- [ ] Organisation and tenant scope remain enforced server-side; no client-supplied authority is trusted.
- [ ] Matter access still goes through the shared access choke point; ethical walls and restricted matters still deny.
- [ ] New mutations write their audit event in the same transaction where required.
- [ ] No real client data, personal information, secrets, tokens or production logs are included.
- [ ] Document, AI and trust-accounting boundaries remain intact; operational trust posting is not enabled.

## Verification

<!-- List the exact commands run and their results. Do not mark a check that did not run. -->

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`

Additional verification:

<!-- Reproduction of the fixed bug, API contract checks, manual UI checks, or other evidence. -->

## Tests and documentation

- [ ] New security boundaries test allowed and denied paths, including cross-tenant and ethical-wall cases.
- [ ] New mutations test persistence, the audit event and permission denial.
- [ ] New API routes are added to `implementedRoutes` and the OpenAPI document.
- [ ] Relevant documentation is updated; significant decisions are recorded as an ADR.
- [ ] Permission changes include regenerated `docs/security/permission-matrix.md`.

## UI and accessibility

<!-- For visible changes: screenshots in light and dark mode, keyboard checks, and any remaining limitations. Write "Not applicable" otherwise. -->

## AI assistance

<!-- Disclose substantial AI assistance and confirm that you reviewed and tested the result. -->

## Checklist

- [ ] The pull request is focused and does not include unrelated changes.
- [ ] I have not weakened tests, lint rules or security checks to make CI pass.
- [ ] I have not claimed compliance, certification or legal correctness without independent evidence.
- [ ] I agree that this contribution is licensed under the repository's MIT License.

## Security vulnerabilities

Do not submit a public pull request for a suspected vulnerability. Use the private process in [SECURITY.md](SECURITY.md).
