/**
 * Roles and permissions are shared by the server, API and UI so that the
 * permission matrix has exactly one source of truth.
 *
 * Permissions are deliberately fine-grained. A role is only a default bundle:
 * matter-level restrictions and ethical walls are enforced separately in the
 * domain services and always take precedence over an org-level permission.
 */

export const ROLES = [
  "owner",
  "admin",
  "principal",
  "solicitor",
  "paralegal",
  "accounts"
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Firm administrator",
  principal: "Principal",
  solicitor: "Solicitor",
  paralegal: "Paralegal",
  accounts: "Accounts"
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full control of the firm, including billing and security settings.",
  admin: "Runs the firm day to day. Cannot access trust operations or billing ownership.",
  principal: "Senior legal practitioner with oversight of clients, matters and teams.",
  solicitor: "Practises on matters, records time and manages matter work.",
  paralegal: "Supports matters and documents without access to financials.",
  accounts: "Billing, trust accounting and financial reporting only."
};

export const PERMISSIONS = [
  "org:read",
  "org:manage",
  "org:billing",
  "user:read",
  "user:manage",
  "audit:read",
  "client:read",
  "client:create",
  "client:update",
  "client:archive",
  "conflict:manage",
  "matter:read",
  "matter:create",
  "matter:update",
  "matter:close",
  "matter:reopen",
  "matter:manage_access",
  "matter:read_financials",
  "document:read",
  "document:upload",
  "document:manage",
  "calendar:read",
  "calendar:create",
  "calendar:update",
  "task:read",
  "task:create",
  "task:update",
  "ai:use",
  "time:read",
  "time:record",
  "billing:read",
  "billing:manage",
  "invoice:approve",
  "trust:read",
  "trust:manage",
  "report:read",
  "portal:manage",
  "integration:read",
  "integration:manage",
  "template:manage",
  "workflow:manage"
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: ReadonlyArray<{ key: Permission; label: string }>;
}

/** Used by the administration matrix UI and by documentation generation. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    key: "firm",
    label: "Firm administration",
    permissions: [
      { key: "org:read", label: "View firm profile" },
      { key: "org:manage", label: "Manage firm settings" },
      { key: "org:billing", label: "Manage subscription and billing" },
      { key: "user:read", label: "View users" },
      { key: "user:manage", label: "Invite and manage users" },
      { key: "audit:read", label: "View audit log" }
    ]
  },
  {
    key: "clients",
    label: "Clients and conflicts",
    permissions: [
      { key: "client:read", label: "View clients" },
      { key: "client:create", label: "Create clients" },
      { key: "client:update", label: "Update clients" },
      { key: "client:archive", label: "Archive clients" },
      { key: "conflict:manage", label: "Record conflict decisions" }
    ]
  },
  {
    key: "matters",
    label: "Matters",
    permissions: [
      { key: "matter:read", label: "View matters" },
      { key: "matter:create", label: "Open matters" },
      { key: "matter:update", label: "Update matters and tasks" },
      { key: "matter:close", label: "Close matters" },
      { key: "matter:reopen", label: "Reopen matters" },
      { key: "matter:manage_access", label: "Manage team and ethical walls" },
      { key: "matter:read_financials", label: "View matter financials" }
    ]
  },
  {
    key: "documents",
    label: "Documents",
    permissions: [
      { key: "document:read", label: "View documents" },
      { key: "document:upload", label: "Upload documents" },
      { key: "document:manage", label: "Manage documents and versions" }
    ]
  },
  {
    key: "calendar",
    label: "Calendar and deadlines",
    permissions: [
      { key: "calendar:read", label: "View calendar and deadlines" },
      { key: "calendar:create", label: "Create events and deadlines" },
      { key: "calendar:update", label: "Edit and verify events and deadlines" }
    ]
  },
  {
    key: "tasks",
    label: "Tasks",
    permissions: [
      { key: "task:read", label: "View tasks" },
      { key: "task:create", label: "Create tasks" },
      { key: "task:update", label: "Complete and reassign tasks" }
    ]
  },
  {
    key: "finance",
    label: "Time, billing and trust",
    permissions: [
      { key: "time:read", label: "View time entries" },
      { key: "time:record", label: "Record time" },
      { key: "billing:read", label: "View invoices and financials" },
      { key: "billing:manage", label: "Prepare and issue invoices" },
      { key: "invoice:approve", label: "Approve invoices" },
      { key: "trust:read", label: "View trust balances" },
      { key: "trust:manage", label: "Post trust transactions" }
    ]
  },
  {
    key: "ai",
    label: "Matter-scoped AI",
    permissions: [{ key: "ai:use", label: "Ask questions using authorised matter sources" }]
  },
  {
    key: "operations",
    label: "Operations and configuration",
    permissions: [
      { key: "report:read", label: "View reports and insights" },
      { key: "portal:manage", label: "Manage client portal access" },
      { key: "integration:read", label: "View integrations" },
      { key: "integration:manage", label: "Connect integrations" },
      { key: "template:manage", label: "Manage templates" },
      { key: "workflow:manage", label: "Manage workflows" }
    ]
  }
] as const;
