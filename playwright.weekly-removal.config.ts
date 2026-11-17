import { defineConfig } from "@playwright/test";
import isolated from "./playwright.oauth.config";

export default defineConfig({
  ...isolated,
  testMatch: ["weekly-review-removed.spec.ts", "reports-selectors.spec.ts"],
});
