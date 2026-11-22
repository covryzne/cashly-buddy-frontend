import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // These suites own authenticated fixture servers in their dedicated configs.
  testIgnore: ["**/chat-ai.spec.ts", "**/offline.spec.ts", "**/receipt-ai.spec.ts", "**/voice-ai.spec.ts", "**/ai-live.spec.ts", "**/profile-permissions.spec.ts"],
  fullyParallel: false,
  use: {
    launchOptions: {
      args: [
        "--enable-unsafe-swiftshader",
        "--use-fake-device-for-media-stream",
      ],
    },
    baseURL: "http://127.0.0.1:3127",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3127",
    url: "http://127.0.0.1:3127",
    reuseExistingServer: false,
  },
});
