import path from "node:path";
import type { NextConfig } from "next";

const allowedDevOrigins = process.env.VEYRA_DEV_ORIGIN ? [process.env.VEYRA_DEV_ORIGIN] : [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  transpilePackages: [
    "@veyra/ai",
    "@veyra/api",
    "@veyra/auth",
    "@veyra/contracts",
    "@veyra/core",
    "@veyra/database",
    "@veyra/integrations",
    "@veyra/ui"
  ],
  // PGlite ships WebAssembly and reads its own files; keep it external to the
  // server bundle. Production connects to PostgreSQL through `pg`.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Next's App Router still bundles PGlite when it is reached through a
      // transpiled workspace package. Bundling breaks PGlite's Node file
      // loading because its URL objects are not recognised by node:fs. Force
      // the native package to stay external so it runs in the Node realm.
      const existingExternals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...existingExternals, "@electric-sql/pglite"];
    }
    return config;
  },
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
