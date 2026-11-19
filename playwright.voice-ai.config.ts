import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: "voice-ai.spec.ts", workers: 1,
  use: { baseURL: "http://127.0.0.1:34567", trace: "retain-on-failure", launchOptions: { args: ["--use-fake-device-for-media-stream"] } },
  projects: [
    { name: "desktop", use: { channel: "chrome", viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { channel: "chrome", viewport: { width: 390, height: 844 } } },
    { name: "iphone-webkit", timeout: 60000, use: { browserName: "webkit", channel: undefined, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: "dark", launchOptions: { args: [] } } },
  ],
  webServer: {
    command: "node scripts/test-oauth-server.mjs", url: "http://127.0.0.1:34567/login",
    env: { CASHLY_TEST_EMAIL: "true", CASHLY_TEST_CHAT: "true" },
    reuseExistingServer: false, timeout: 120000,
  },
});
