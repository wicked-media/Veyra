import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSION_GROUPS, ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@veyra/contracts";
import { hasPermission } from "@veyra/auth";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs", "security", "permission-matrix.md");

const lines: string[] = [
  "# Role and permission matrix",
  "",
  "> Generated from `packages/contracts/src/permissions.ts` and",
  "> `packages/auth/src/permissions.ts` by `pnpm docs:permissions`.",
  "> Do not edit this table by hand.",
  "",
  "Roles are firm-level defaults. Every operation is authorised on the server.",
  "Matter restrictions and ethical walls are applied **after** these grants and can",
  "only reduce access — they never grant it.",
  "",
  "## Role summary",
  "",
  "| Role | Default scope |",
  "| --- | --- |"
];

for (const role of ROLES) {
  lines.push(`| **${ROLE_LABELS[role]}** | ${ROLE_DESCRIPTIONS[role]} |`);
}

lines.push(
  "",
  "## Matrix",
  "",
  `| Permission | ${ROLES.map((role) => ROLE_LABELS[role]).join(" | ")} |`,
  `| --- | ${ROLES.map(() => ":---:").join(" | ")} |`
);

for (const group of PERMISSION_GROUPS) {
  lines.push(`| **${group.label}** | ${ROLES.map(() => "").join(" | ")} |`);
  for (const permission of group.permissions) {
    const grants = ROLES.map((role) => (hasPermission(role, permission.key) ? "Yes" : "—"));
    lines.push(`| ${permission.label} (\`${permission.key}\`) | ${grants.join(" | ")} |`);
  }
}

lines.push(
  "",
  "## Enforcement notes",
  "",
  "- An owner or administrator does **not** bypass an ethical wall. The wall is a deny-list.",
  "- A restricted matter requires explicit matter membership even for owners.",
  "- Denied access to a restricted or walled matter returns `404 Not Found`, not `403`, so the",
  "  existence of the matter is not disclosed.",
  "- API and server actions resolve the actor from the session. Client-supplied organisation,",
  "  role and permission values are ignored.",
  "- Trust permissions exist for the future trust module, but trust operations remain disabled",
  "  until independent validation (see `docs/decisions/0007-trust-module-gate.md`).",
  ""
);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, lines.join("\n"), "utf8");
console.log(`Wrote ${path.relative(root, output)}`);
