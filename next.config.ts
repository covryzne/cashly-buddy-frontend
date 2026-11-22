import type { NextConfig } from "next";

const appOrigin = process.env.APP_ORIGIN;
const devAppHostname = process.env.NODE_ENV === "development" && appOrigin && URL.canParse(appOrigin)
  ? new URL(appOrigin).hostname
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: devAppHostname ? ["127.0.0.1", devAppHostname] : ["127.0.0.1"],
  // Keep offline browser test builds away from a running developer's HMR output.
  distDir: process.env.CASHLY_TEST_BUILD === "offline" ? ".next-offline-test" : ".next",
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
            headers: [{ key: "X-Cashly-Offline-Shell", value: "public-account-v2" }],
          }]
        : []),
    ];
  },
};

export default nextConfig;
