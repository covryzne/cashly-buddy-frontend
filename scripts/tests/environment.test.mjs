import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  branchEnvironment,
  detectBranch,
  parseArguments,
  resolveEnvironment,
} from "../environment.mjs";

const root = join(
  process.cwd(),
  "node_modules",
  ".cashly-qa",
  "environment-tests",
);
mkdirSync(root, { recursive: true });
function fixture(files = {}) {
  const cwd = mkdtempSync(join(root, "case-"));
  for (const [name, content] of Object.entries(files))
    writeFileSync(join(cwd, name), content);
  return cwd;
}
const samples = {
  ".env.dev": "PRIVATE_KEY=dev-only\nNEXT_PUBLIC_LABEL=development\n",
  ".env.staging": "PRIVATE_KEY=staging-only\nNEXT_PUBLIC_LABEL=staging\n",
  ".env.prod": "PRIVATE_KEY=prod-only\nNEXT_PUBLIC_LABEL=production\n",
};

test("Branch mapping includes refs, named deployment branches and safe feature fallback", () => {
  for (const branch of [
    "dev",
    "develop",
    "development",
    "feature/otp",
    "refs/heads/dev",
  ])
    assert.equal(branchEnvironment(branch), "dev");
  for (const branch of ["staging", "stage", "refs/heads/staging"])
    assert.equal(branchEnvironment(branch), "staging");
  for (const branch of [
    "main",
    "master",
    "prod",
    "production",
    "refs/heads/main",
  ])
    assert.equal(branchEnvironment(branch), "prod");
});

test("Selected branch reads only its own configuration", () => {
  const cwd = fixture(samples);
  for (const [branch, key, label] of [
    ["dev", "dev-only", "development"],
    ["staging", "staging-only", "staging"],
    ["main", "prod-only", "production"],
  ]) {
    const result = resolveEnvironment({
      cwd,
      command: "build",
      branch,
      env: {},
    });
    assert.equal(result.childEnv.PRIVATE_KEY, key);
    assert.equal(result.childEnv.NEXT_PUBLIC_LABEL, label);
    assert.equal(result.childEnv.NODE_ENV, "production");
  }
});

test("Explicit environment beats branch; CI process values beat file values", () => {
  const cwd = fixture(samples);
  const result = resolveEnvironment({
    cwd,
    command: "dev",
    branch: "main",
    env: { CASHLY_ENV: "staging", PRIVATE_KEY: "ci-secret" },
  });
  assert.equal(result.environment, "staging");
  assert.equal(result.childEnv.PRIVATE_KEY, "ci-secret");
  assert.equal(result.childEnv.NODE_ENV, "development");
  const cli = resolveEnvironment({
    cwd,
    command: "build",
    branch: "main",
    env: { CASHLY_ENV: "prod" },
    override: "dev",
  });
  assert.equal(cli.environment, "dev");
});

test("CI branch metadata precedes Git and PR head precedes merge ref", () => {
  const cwd = fixture();
  assert.equal(
    detectBranch(cwd, {
      GITHUB_HEAD_REF: "feature/otp",
      GITHUB_REF_NAME: "12/merge",
    }),
    "feature/otp",
  );
  assert.equal(detectBranch(cwd, { CI_COMMIT_REF_NAME: "staging" }), "staging");
  assert.equal(detectBranch(cwd, { VERCEL_GIT_COMMIT_REF: "main" }), "main");
  assert.equal(
    detectBranch(cwd, { BUILD_SOURCEBRANCH: "refs/heads/staging" }),
    "refs/heads/staging",
  );
});

test("Detached build/start needs explicit environment; dev can default safely", () => {
  const cwd = fixture(samples);
  for (const command of ["build", "start"])
    assert.throws(
      () => resolveEnvironment({ cwd, command, branch: null, env: {} }),
      /CASHLY_ENV/,
    );
  assert.equal(
    resolveEnvironment({ cwd, command: "dev", branch: null, env: {} })
      .environment,
    "dev",
  );
  assert.equal(
    resolveEnvironment({
      cwd,
      command: "start",
      branch: null,
      env: { CASHLY_ENV: "prod" },
    }).environment,
    "prod",
  );
});

test("Missing staging/prod never falls back to dev", () => {
  const cwd = fixture({ ".env.dev": samples[".env.dev"] });
  assert.throws(
    () =>
      resolveEnvironment({ cwd, command: "build", branch: "staging", env: {} }),
    /\.env.staging belum ada/,
  );
  assert.throws(
    () =>
      resolveEnvironment({ cwd, command: "build", branch: "main", env: {} }),
    /\.env.prod belum ada/,
  );
});

test("Deployment system mode skips file contents while retaining explicit selection", () => {
  const cwd = fixture(samples);
  const result = resolveEnvironment({
    cwd,
    command: "start",
    branch: null,
    env: {
      CASHLY_ENV: "staging",
      CASHLY_ENV_SOURCE: "system",
      PRIVATE_KEY: "injected",
    },
  });
  assert.equal(result.childEnv.PRIVATE_KEY, "injected");
  assert.equal(result.childEnv.NEXT_PUBLIC_LABEL, undefined);
  assert.equal(result.environment, "staging");
});

test("Rejects mixed legacy files, invalid selectors and path traversal", () => {
  const cwd = fixture({
    ...samples,
    ".env.development.local": "PRIVATE_KEY=old-secret\n",
  });
  assert.throws(
    () => resolveEnvironment({ cwd, command: "dev", branch: "dev", env: {} }),
    /legacy/,
  );
  for (const override of ["../../secret", "production", "", "dev\nprod"])
    assert.throws(
      () =>
        resolveEnvironment({
          cwd,
          command: "dev",
          branch: "dev",
          env: {},
          override,
        }),
      /CASHLY_ENV/,
    );
  assert.throws(
    () =>
      resolveEnvironment({
        cwd,
        command: "dev",
        branch: "dev",
        env: { CASHLY_ENV_SOURCE: "unknown" },
      }),
    /CASHLY_ENV_SOURCE/,
  );
});

test("Native parsing preserves quoted values, comments and literal shell text", () => {
  const cwd = fixture({
    ".env.dev":
      'TEXT="value # preserved"\nPRIVATE_KEY="$(never-execute)"\nEMPTY=\nNODE_ENV=staging\n',
  });
  const { childEnv } = resolveEnvironment({
    cwd,
    command: "dev",
    branch: "dev",
    env: {},
  });
  assert.equal(childEnv.TEXT, "value # preserved");
  assert.equal(childEnv.PRIVATE_KEY, "$(never-execute)");
  assert.equal(childEnv.EMPTY, "");
  assert.equal(childEnv.NODE_ENV, "development");
});

test("Runner preserves Next host/port arguments and rejects ambiguous selectors", () => {
  assert.deepEqual(
    parseArguments([
      "dev",
      "--app-env=staging",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3131",
    ]),
    {
      command: "dev",
      override: "staging",
      forwarded: ["--hostname", "127.0.0.1", "--port", "3131"],
    },
  );
  assert.equal(parseArguments(["build", "--app-env", "prod"]).override, "prod");
  for (const args of [
    ["other"],
    ["dev", "--app-env"],
    ["build", "--app-env=dev", "--app-env=prod"],
  ])
    assert.throws(() => parseArguments(args));
});
