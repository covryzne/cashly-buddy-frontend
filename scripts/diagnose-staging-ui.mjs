// Explicit staging diagnostic. Credentials come from ephemeral env; no trace/cookies saved.
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const base = process.env.CASHLY_TEST_ORIGIN ?? "http://127.0.0.1:3017";
assert(["127.0.0.1", "localhost"].includes(new URL(base).hostname));
assert(process.env.CASHLY_TEST_EMAIL && process.env.CASHLY_TEST_PASSWORD);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const calls = [];
page.on("response", response => {
  const url = new URL(response.url());
  if (!url.pathname.startsWith("/api/cashly/")) return;
  calls.push({ method: response.request().method(),
    route: url.pathname.replace(/[0-9a-f-]{36}/g, ":id"), status: response.status(),
    server_timing: response.headers()["server-timing"], request_id: response.headers()["x-request-id"] });
});
let id;
let cleanup = false;
const report = { environment: "staging", calls };
async function api(method, path, data) {
  const response = await context.request.fetch(base + "/api/cashly/" + path, {
    method, headers: { Origin: base, "Idempotency-Key": randomUUID() }, data, timeout: 45000,
  });
  assert(response.ok(), `${method} ${path.split("/")[0]} HTTP ${response.status()}`);
  return (await response.json()).data;
}
try {
  await page.goto(base + "/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill(process.env.CASHLY_TEST_EMAIL);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(process.env.CASHLY_TEST_PASSWORD);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/, { timeout: 60000 });
  await expect(page.locator(".expense-summary")).toBeVisible();
  if (process.env.CASHLY_TEST_CHAT_ONLY !== "true") {
  const marker = "Performance UI QA " + randomUUID().slice(0, 8);
  const row = await api("POST", "expenses", { merchant: marker, description: marker,
    category_code: "food_drink", payment_method: "qris", amount_idr: "1000",
    occurred_at: new Date(Date.now() - 86400000).toISOString(),
    items: [{ label: "QA", quantity: 1, unit_price_idr: "1000" }] });
  id = row.id;
  await page.goto(base + "/aktivitas");
  await page.locator(`[data-modal-focus-key="expense:${id}"]`).click();
  const opened = Date.now();
  await page.getByRole("button", { name: "Ubah detail", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ubah pengeluaran", exact: true })).toBeVisible();
  report.open_edit_ms = Date.now() - opened;
  const beforeEdit = calls.length;
  await page.getByRole("textbox", { name: "Merchant (opsional)", exact: true }).fill(marker + " Edited");
  const started = Date.now();
  await page.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ubah pengeluaran", exact: true })).toHaveCount(0);
  report.save_edit_ms = Date.now() - started;
  assert(calls.slice(beforeEdit).every(call => !/gamification|\/expenses$/.test(call.route)), "Edit triggered a full refresh");
  await expect(page.getByRole("dialog", { name: "Detail pengeluaran", exact: true })).toContainText(marker + " Edited");
  await page.getByRole("button", { name: "Hapus", exact: true }).click();
  await page.getByRole("button", { name: "Hapus pengeluaran", exact: true }).click();
  await expect(page.locator(`[data-modal-focus-key="expense:${id}"]`)).toHaveCount(0);
  const undo = page.getByRole("button", { name: /Urungkan/ });
  await undo.click();
  await expect(page.locator(`[data-modal-focus-key="expense:${id}"]`)).toBeVisible();
  report.crud_ui_passed = true;
  }

  if (process.env.CASHLY_TEST_CHAT_LIVE === "true") {
    await page.getByRole("button", { name: "Catat pengeluaran", exact: true }).first().click();
    await page.locator('[data-modal-focus-key="method:Chat manual"]').click();
    await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill("kemarin w maksi nasi padang 12000 qris");
    await page.getByRole("button", { name: "Kirim catatan" }).click();
    await expect(page.getByText("Mochi sedang mengetik…", { exact: true })).toBeVisible();
    await expect(page.locator(".expense-message-user")).toContainText("nasi padang");
    await expect(page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ })).toBeVisible({ timeout: 55000 });
    await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
    await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Ubah/ }).first().click();
    const merchant = await page.getByRole("textbox", { name: "Merchant (opsional)", exact: true }).inputValue();
    assert(merchant.trim().length > 0 && /padang/i.test(merchant));
    report.chat_preview_merchant = merchant;
    report.chat_saved = false;
  }
} catch (error) {
  report.failed = true;
  report.failure_type = error.name;
  process.exitCode = 1;
} finally {
  try {
    if (id) {
      const row = await api("GET", "expenses/" + id);
      await api("DELETE", "expenses/" + id + "?version=" + row.version);
      cleanup = true;
    }
  } finally {
    report.test_record_deleted = id ? cleanup : "no_test_record_created";
    await mkdir("docs", { recursive: true });
    await writeFile("docs/performance-staging-ui.json", JSON.stringify(report, null, 2));
    await browser.close();
  }
}
console.log(JSON.stringify(report, null, 2));
