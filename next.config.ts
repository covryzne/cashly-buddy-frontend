import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind uses postcss.config.mjs; Next handles CSS imports natively.
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
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
