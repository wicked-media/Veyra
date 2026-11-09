import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const workspacePackages: Record<string, string> = {
  auth: "packages",
  contracts: "packages",
  core: "packages",
  database: "packages",
  ui: "packages",
  ai: "packages",
  integrations: "packages",
  api: "apps"
};

export default defineConfig({
  resolve: {
    alias: Object.entries(workspacePackages).map(([name, directory]) => ({
      find: new RegExp(`^@veyra/${name}$`),
      replacement: path.join(root, directory, name, "src", "index.ts")
    }))
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
    reporters: ["default"]
  }
});
