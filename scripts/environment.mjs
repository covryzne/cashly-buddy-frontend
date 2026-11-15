import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const allowed = new Set(["dev", "staging", "prod"]);
const legacyFiles = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
];

/** @param {string} branch */
export function branchEnvironment(branch) {
  const name = branch.replace(/^refs\/heads\//, "").toLowerCase();
  if (["main", "master", "prod", "production"].includes(name)) return "prod";
  if (["stage", "staging"].includes(name)) return "staging";
  return "dev";
}

export function detectBranch(cwd, env = process.env) {
  for (const key of [
    "GITHUB_HEAD_REF",
    "GITHUB_REF_NAME",
    "CI_COMMIT_REF_NAME",
    "VERCEL_GIT_COMMIT_REF",
    "BUILD_SOURCEBRANCH",
  ]) {
    if (env[key]?.trim()) return env[key].trim();
  }
  try {
    return (
      execFileSync(
        "git",
        [
          "-c",
          `safe.directory=${cwd.replaceAll("\\", "/")}`,
          "symbolic-ref",
          "--quiet",
          "--short",
          "HEAD",
        ],
        {
          cwd,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          windowsHide: true,
        },
      ).trim() || null
    );
  } catch {
    return null;
  }
}

/** @param {{cwd: string, command: string, env?: NodeJS.ProcessEnv, override?: string, branch?: string|null}} options */
export function resolveEnvironment({
  cwd,
  command,
  env = process.env,
  override,
  branch = detectBranch(cwd, env),
}) {
  const explicit = override ?? env.CASHLY_ENV;
  if (explicit !== undefined && !allowed.has(explicit))
    throw new Error("CASHLY_ENV / --app-env harus dev, staging, atau prod.");
  const environment =
    explicit ??
    (branch ? branchEnvironment(branch) : command === "dev" ? "dev" : null);
  if (!environment)
    throw new Error(
      "Branch tidak tersedia. Tetapkan CASHLY_ENV=dev|staging|prod untuk build/start.",
    );
  const source = env.CASHLY_ENV_SOURCE ?? "file";
  if (source !== "file" && source !== "system")
    throw new Error("CASHLY_ENV_SOURCE harus file atau system.");
  const file = `.env.${environment}`;
  const conflicts = legacyFiles.filter((name) => existsSync(join(cwd, name)));
  if (conflicts.length)
    throw new Error(
      `Gunakan ${file}; pindahkan konfigurasi legacy ${conflicts.join(", ")} agar sumber env tidak tercampur.`,
    );
  let values = {};
  if (source === "file") {
    if (!existsSync(join(cwd, file)))
      throw new Error(
        `${file} belum ada. Salin ${file}.example dan isi, atau gunakan CASHLY_ENV_SOURCE=system untuk variabel deployment.`,
      );
    values = parseEnv(readFileSync(join(cwd, file), "utf8"));
  }
  const inherited = Object.fromEntries(
    Object.entries(env).filter(([, value]) => typeof value === "string"),
  );
  return {
    environment,
    branch,
    source,
    file,
    // Never pass this object to a client component or print it.
    childEnv: {
      ...values,
      ...inherited,
      CASHLY_ENV: environment,
      NODE_ENV: command === "dev" ? "development" : "production",
    },
  };
}

/** @param {string[]} args */
export function parseArguments(args) {
  const [command, ...rest] = args;
  if (!["dev", "build", "start", "check"].includes(command))
    throw new Error("Gunakan dev, build, start, atau check.");
  let override;
  const forwarded = [];
  for (let i = 0; i < rest.length; i++) {
    const value = rest[i];
    if (value === "--app-env") {
      if (override !== undefined || !rest[i + 1] || rest[i + 1].startsWith("-"))
        throw new Error("Isi --app-env sekali dengan dev, staging, atau prod.");
      override = rest[++i];
    } else if (value.startsWith("--app-env=")) {
      if (override !== undefined) throw new Error("Isi --app-env sekali saja.");
      override = value.slice("--app-env=".length);
    } else forwarded.push(value);
  }
  return { command, override, forwarded };
}
