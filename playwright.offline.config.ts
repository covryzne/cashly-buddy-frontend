import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: "offline.spec.ts", workers: 1, timeout: 70000,
  use: { baseURL: "http://127.0.0.1:34567", channel: "chrome", trace: "retain-on-failure", reducedMotion: "reduce", timezoneId: "Asia/Jakarta" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node scripts/test-oauth-server.mjs", url: "http://127.0.0.1:34567/login",
    env: { CASHLY_TEST_EMAIL: "true", CASHLY_TEST_CHAT: "true", CASHLY_TEST_OFFLINE: "true", CASHLY_TEST_BUILD: "offline" },
    reuseExistingServer: false, timeout: 120000,
  },
});
