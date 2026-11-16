import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: ["google-oauth.spec.ts", "login.spec.ts"], workers: 1,
  use: { baseURL: "http://127.0.0.1:34567", channel: "chrome", trace: "off" },
  webServer: {
    command: "node scripts/test-oauth-server.mjs", url: "http://127.0.0.1:34567/login",
    reuseExistingServer: false, timeout: 120000,
  },
});
