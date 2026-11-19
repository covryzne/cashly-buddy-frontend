import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: "chat-ai.spec.ts", workers: 1,
  use: { baseURL: "http://127.0.0.1:34567", channel: "chrome", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "node scripts/test-oauth-server.mjs", url: "http://127.0.0.1:34567/login",
    env: { CASHLY_TEST_EMAIL: "true", CASHLY_TEST_CHAT: "true" },
    reuseExistingServer: false, timeout: 120000,
  },
});
