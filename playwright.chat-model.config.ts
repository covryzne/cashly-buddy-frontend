import { defineConfig } from "@playwright/test";

// Pure parser/draft contract tests: no browser, build, authentication or web server.
export default defineConfig({
  testDir: "./tests",
  testMatch: ["chat-batch-model.spec.ts", "expense-chat-parser.spec.ts"],
  workers: 1,
});
