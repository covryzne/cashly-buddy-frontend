import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const env = { ...process.env, CASHLY_TEST_BUILD: "offline", CASHLY_ENV: "dev",
  APP_ORIGIN: "http://127.0.0.1:34567", CASHLY_API_ORIGIN: "http://127.0.0.1:34568" };
async function run(file, args) {
  const child = spawn(process.execPath, [file, ...args], { env, stdio: "inherit", windowsHide: true });
  const stop = () => child.kill();
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject); child.on("exit", value => resolve(value ?? 1));
  });
  process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop);
  if (code !== 0) throw new Error(`Offline verification exited with ${code}`);
}
try {
  await run(require.resolve("next/dist/bin/next"), ["build"]);
  await run(require.resolve("@playwright/test/cli"), ["test", "--config=playwright.offline.config.ts", ...process.argv.slice(2)]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
