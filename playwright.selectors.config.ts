import { defineConfig } from "@playwright/test";

// Pure selectors: no server, browser, private env or database required.
export default defineConfig({testDir:"./tests",testMatch:"reports-selectors.spec.ts",workers:1});
