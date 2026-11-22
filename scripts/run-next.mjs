import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArguments, resolveEnvironment } from "./environment.mjs";

const cwd = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);

try {
  const { command, override, forwarded } = parseArguments(
    process.argv.slice(2),
  );
  const config = resolveEnvironment({ cwd, command, override });
  console.log(
    `[Cashly] ${config.environment} → ${config.source === "file" ? config.file : "system environment"} · branch ${JSON.stringify(config.branch ?? "detached/none")}`,
  );
  if (command !== "check") {
    const metadata = join(cwd, ".next", "cashly-environment.json");
    if (command === "start") {
      if (!existsSync(metadata))
        throw new Error(
          "Jalankan npm run build dengan environment yang sama sebelum start.",
        );
      const build = JSON.parse(readFileSync(metadata, "utf8"));
      if (build.environment !== config.environment)
        throw new Error(
          "Environment build berbeda dari start. Build ulang untuk environment tujuan.",
        );
    }
    const child = spawn(
      process.execPath,
      [require.resolve("next/dist/bin/next"), command, ...forwarded],
      { cwd, env: config.childEnv, stdio: "inherit", windowsHide: true },
    );
    const signals = ["SIGINT", "SIGTERM"];
    const forward = (signal) => {
      if (!child.killed) child.kill(signal);
    };
    for (const signal of signals) process.on(signal, forward);
    const code = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (exitCode, signal) =>
        resolve(exitCode ?? (signal === "SIGINT" ? 130 : 1)),
      );
    });
    for (const signal of signals) process.off(signal, forward);
    if (code === 0 && command === "build")
      writeFileSync(
        metadata,
        JSON.stringify({ environment: config.environment }) + "\n",
      );
    process.exitCode = code;
  }
} catch (error) {
  console.error(`[Cashly] ${error.message}`);
  process.exitCode = 1;
}
