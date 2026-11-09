import type { Permission, Role } from "@veyra/contracts";
import { PERMISSIONS } from "@veyra/contracts";

/**
 * Default permission bundles per role.
 *
 * These grants operate at firm level. Matter access is narrower:
 * restricted matters require explicit matter membership, and an ethical wall
 * denies access even where a role would otherwise allow it.
 */
const OWNER: readonly Permission[] = PERMISSIONS;

const ADMIN: readonly Permission[] = PERMISSIONS.filter(
  (permission) => !["org:billing", "trust:manage"].includes(permission)
);

const PRINCIPAL: readonly Permission[] = [
  "org:read",
  "user:read",
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
  "report:read",
  "portal:manage",
  "integration:read",
  "template:manage",
  "workflow:manage"
];

const SOLICITOR: readonly Permission[] = [
  "org:read",
  "user:read",
  "client:read",
  "client:create",
  "client:update",
  "matter:read",
  "matter:create",
  "matter:update",
  "matter:close",
  "matter:read_financials",
  "document:read",
  "document:upload",
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
  "report:read",
  "integration:read"
];

const PARALEGAL: readonly Permission[] = [
  "org:read",
  "user:read",
  "client:read",
  "matter:read",
  "document:read",
  "document:upload",
  "calendar:read",
  "calendar:create",
  "task:read",
  "task:create",
  "task:update",
  "time:read",
  "time:record",
  "integration:read"
];

const ACCOUNTS: readonly Permission[] = [
  "org:read",
  "user:read",
  "client:read",
  "matter:read",
  "matter:read_financials",
  "calendar:read",
  "time:read",
  "billing:read",
  "billing:manage",
  "invoice:approve",
  "trust:read",
  "trust:manage",
  "report:read",
  "integration:read"
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: OWNER,
  admin: ADMIN,
  principal: PRINCIPAL,
  solicitor: SOLICITOR,
  paralegal: PARALEGAL,
  accounts: ACCOUNTS
};

const permissionSets = new Map<Role, ReadonlySet<Permission>>(
  Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => [
    role as Role,
    new Set(permissions)
  ])
);

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionSets.get(role)?.has(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
