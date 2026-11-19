// Sequential fixture servers share loopback ports; QA builds never touch dev HMR.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const env = { ...process.env, CASHLY_TEST_BUILD: "offline", CASHLY_ENV: "dev",
  CASHLY_ENV_SOURCE: "system", APP_ORIGIN: "http://127.0.0.1:34567", CASHLY_API_ORIGIN: "http://127.0.0.1:34568" };
async function run(file, args, extra = {}) {
  const child = spawn(process.execPath, [file, ...args], { env: { ...env, ...extra }, stdio: "inherit", windowsHide: true });
  const stop = () => child.kill(); process.once("SIGINT", stop); process.once("SIGTERM", stop);
  try { return await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", code => resolve(code ?? 1)); }); }
  finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}
const destination = path.resolve("../specs/verification/multimodal-browser.json");
const requested = process.argv[process.argv.indexOf("--suite") + 1];
const suites = process.argv.includes("--suite") ? [requested] : ["receipt", "voice", "chat", "offline"];
if (suites.some(suite => !["receipt", "voice", "chat", "offline"].includes(suite))) throw new Error("Unknown suite");
const report = { synthetic_auth_api: true, real_browser: true, suites: [] };
try {
  const previous = JSON.parse(await readFile(destination, "utf8"));
  report.suites = (previous.suites ?? []).filter(row => !suites.includes(row.suite));
} catch { /* First run. */ }
try {
  if (!process.argv.includes("--skip-build") && await run(require.resolve("next/dist/bin/next"), ["build"]) !== 0) throw new Error("QA build failed");
  for (const suite of suites) {
    const config = suite === "offline" ? "playwright.offline.config.ts" : `playwright.${suite}-ai.config.ts`.replace("receipt-ai", "receipt");
    const output = path.resolve(`test-results/multimodal-${suite}.json`);
    const code = await run(require.resolve("@playwright/test/cli"), ["test", `--config=${config}`, "--reporter=line,json", `--output=test-results/multimodal/${suite}`], { PLAYWRIGHT_JSON_OUTPUT_NAME: output });
    const result = JSON.parse(await readFile(output, "utf8"));
    report.suites.push({ suite, passed: result.stats.expected, failed: result.stats.unexpected,
      skipped: result.stats.skipped, flaky: result.stats.flaky, duration_ms: result.stats.duration, exit_code: code });
    if (code !== 0) process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(report, null, 2) + "\n");
}
