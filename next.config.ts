import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: { incomingRequests: false },
  // Tailwind uses postcss.config.mjs; Next handles CSS imports natively.
  cacheComponents: true,
  partialPrefetching: true,
  // Keep static build workers bounded on local machines running Docker + the API.
  experimental: { cpus: 2 },
  async headers() {
    return [
      { source: "/auth/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/auth/callback", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/auth/google/connect/callback", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      {
        source: "/asset-worker.js",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline-worker.js",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      ...(process.env.NODE_ENV === "production"
        ? [{
            source: "/offline",
            headers: [{ key: "X-Cashly-Offline-Shell", value: "public-demo-v1" }],
          }]
        : []),
    ];
  },
  async redirects() {
    return [{ source: "/", destination: "/login", permanent: false }];
  },
};

export default nextConfig;
