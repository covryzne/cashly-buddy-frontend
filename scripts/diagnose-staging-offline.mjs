// Read-only real-account check. No traces, saved cookies, transaction writes or AI calls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const origin = process.env.CASHLY_TEST_ORIGIN ?? "http://127.0.0.1:3017";
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
assert(process.env.CASHLY_TEST_EMAIL && process.env.CASHLY_TEST_PASSWORD);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: "Asia/Jakarta", reducedMotion: "reduce" });
const page = await context.newPage(); page.setDefaultTimeout(30000);
const report = { environment: "staging", passed: false, expenseWrites: 0, offlineApiRequests: 0 };
let countOffline = false;
page.on("request", request => {
  if (request.method() !== "GET" && /\/api\/cashly\/(expenses|gamification)/.test(request.url())) report.expenseWrites++;
  if (countOffline && /\/api\/|\/auth\/session/.test(request.url())) report.offlineApiRequests++;
});
try {
  await page.goto(origin + "/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill(process.env.CASHLY_TEST_EMAIL);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(process.env.CASHLY_TEST_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/, { timeout: 60000 });
  await expect(page.getByText("Salinan data tersimpan di perangkat ini.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => Boolean(await (await caches.open("cashly-offline-shell-v2-account")).match("/offline-shell-manifest"))), { timeout: 45000 }).toBe(true);
  const runtime = await page.evaluate(async () => {
    const db = await new Promise(resolve => { const open = indexedDB.open("cashly-account-offline-v1"); open.onsuccess = () => resolve(open.result); });
    return new Promise(resolve => {
      const tx = db.transaction("snapshots", "readonly"), store = tx.objectStore("snapshots");
      const active = store.get("active"); let value;
      active.onsuccess = () => { const saved = store.get(active.result.accountId); saved.onsuccess = () => { value = saved.result.account.runtime; }; };
      tx.oncomplete = () => { db.close(); resolve(value); };
    });
  });
  assert(runtime?.environment === "staging" && runtime.database_kind === "hosted", "Expected staging/hosted runtime");
  await expect(page.locator(".expense-summary .hero-amount")).toBeVisible();
  const total = await page.locator(".expense-summary .hero-amount").innerText();
  await context.setOffline(true);
  countOffline = true;
  await page.reload();
  await expect(page.getByRole("status", { name: "Status koneksi", exact: true })).toHaveAttribute("data-state", "offline");
  await expect(page.locator(".expense-summary .hero-amount")).toHaveText(total);
  for (const path of ["/aktivitas", "/laporan", "/profil"]) {
    await page.goto(origin + path);
    await expect(page.getByRole("status", { name: "Status koneksi", exact: true })).toHaveAttribute("data-state", "offline");
  }
  assert(report.offlineApiRequests === 0, "Offline attempted an API request");
  report.cacheReady = true; report.dataPreserved = true;
  // Stop counting before going back online, where revalidation is required.
  countOffline = false;
  await context.setOffline(false);
  await expect(page.getByRole("status", { name: "Status koneksi", exact: true })).toHaveAttribute("data-state", "online", { timeout: 30000 });
  assert(report.expenseWrites === 0, "Read-only verification attempted a mutation");
  report.reconnected = true; report.passed = true;
} catch (error) {
  report.failureType = error.name; process.exitCode = 1;
} finally {
  await mkdir("docs", { recursive: true });
  await writeFile("docs/offline-staging-verification.json", JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report));
