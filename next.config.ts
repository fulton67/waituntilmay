import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The CRM e2e server builds into its own folder so it can run beside a normal `next dev`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // PGlite (local-dev database) loads its WASM from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  async headers() {
    return [
      {
        source: "/essdee-kid-mask.pdf",
        headers: [
          {
            key: "Content-Disposition",
            value: 'attachment; filename="essdee kid mask.pdf"',
          },
          {
            key: "Content-Type",
            value: "application/pdf",
          },
        ],
      },
      {
        source: "/lunch-bells.pdf",
        headers: [
          {
            key: "Content-Disposition",
            value: 'attachment; filename="lunch bells.pdf"',
          },
          {
            key: "Content-Type",
            value: "application/pdf",
          },
        ],
      },
      {
        source: '/morphogen(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
