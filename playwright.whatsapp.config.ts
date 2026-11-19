import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  testDir: "./tests",
  testMatch: "whatsapp-sheet.spec.ts",
  fullyParallel: false,
  use: {
    baseURL: base.use?.baseURL,
    trace: "retain-on-failure",
  },
  webServer: base.webServer,
  projects: [
    { name: "chrome", use: { browserName: "chromium", channel: "chrome" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
