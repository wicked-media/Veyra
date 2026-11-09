# End-to-end tests

No browser end-to-end suite is implemented yet. The current verification covers domain/services,
security boundaries and API contracts with real databases; it does not prove rendered UI behaviour.

Stage 3 will add Playwright tests for:

1. Sign-in, forced password change and sign-out.
2. Permission-aware navigation and direct-URL denial.
3. Matter creation, team visibility and restricted-matter 404s.
4. Ethical-wall denial through search, tasks and audit views.
5. Keyboard navigation and command palette.
6. Responsive layout and dark mode.
7. Accessibility checks on primary flows.

Tests must run against an isolated database and synthetic `.demo` data, never real client data.
