import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Offline tests exercise the built public shell, without account/bot services.
// Start Next directly so the Windows test server has a single process owner.
export default defineConfig({
  ...config,
  webServer: process.env.CASHLY_E2E_EXTERNAL_SERVER === "1" ? undefined : {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3127",
    url: "http://127.0.0.1:3127",
    reuseExistingServer: false,
  },
});
