import { defineConfig } from "@playwright/test";
import sheets from "./playwright.whatsapp.config";

export default defineConfig({
  ...sheets,
  testMatch: ["whatsapp-sheet.spec.ts", "shared-sheet.spec.ts"],
});
