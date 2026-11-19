// Real local FastAPI/PostgreSQL + real configured AI. Synthetic login and media only.
import { test, expect } from "@playwright/test";
import sharp from "sharp";

test.skip(!process.env.CASHLY_TEST_REAL_API || !process.env.CASHLY_LIVE_AUDIO_PATH, "Explicit live AI verification only");
test.use({ reducedMotion: "reduce" });

test("actual OCR and VN to preview/save, uncertain response replay, and expense cleanup", async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
  await request.post("/auth/email/register", { headers: { Origin: "http://127.0.0.1:34567" }, data: {
    name: "AI Live Tester", email: "ai-live@example.invalid", password: "Local-Test123!", confirmPassword: "Local-Test123!",
  } });
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("ai-live@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("button", { name: /Scan struk otomatis/ }).click();
  const image = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="700" height="480"><rect width="100%" height="100%" fill="white"/><g font-size="32" fill="black"><text x="40" y="60">WARUNG CONTOH</text><text x="40" y="120">17 November 2026 12:00</text><text x="40" y="180">Nasi Padang 1 x 12000</text><text x="40" y="240">TOTAL Rp 12000</text><text x="40" y="300">Bayar QRIS</text></g></svg>')).png().toBuffer();
  await page.getByLabel("Pilih foto struk", { exact: true }).setInputFiles({ name: "synthetic-receipt.png", mimeType: "image/png", buffer: image });
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Review struk", exact: true })).toBeVisible({ timeout: 50000 });
  expect((await (await page.request.get("/api/cashly/expenses")).json()).data).toHaveLength(0);
  await page.locator("#scan-merchant").fill("QA_LIVE_OCR");
  await page.getByRole("button", { name: /Simpan pengeluaran/ }).click();
  await expect(page.getByRole("dialog", { name: "Konfirmasi pengeluaran", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  let rows = (await (await page.request.get("/api/cashly/expenses")).json()).data;
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ source: "receipt", amount_idr: "12000", merchant: "QA_LIVE_OCR" });

  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("button", { name: /Voice note kilat/ }).click();
  await page.getByLabel("Pilih berkas audio").setInputFiles(process.env.CASHLY_LIVE_AUDIO_PATH!);
  await page.getByRole("button", { name: "Buat transkrip" }).click();
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).toBeVisible({ timeout: 50000 });
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).not.toBeEmpty();
  // Explicit correction must drive the draft instead of the audio's original amount.
  await page.getByRole("textbox", { name: "Transkrip voice note" }).fill("Hari ini beli nasi padang 15000 rupiah bayar QRIS");
  await page.getByRole("button", { name: "Tinjau pengeluaran", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible({ timeout: 50000 });
  expect((await (await page.request.get("/api/cashly/expenses")).json()).data).toHaveLength(1);
  await page.getByRole("button", { name: "Ubah pengeluaran 1" }).click();
  await page.locator("#scan-merchant").fill("QA_LIVE_VN");
  await page.getByRole("button", { name: "Selesai mengubah" }).click();
  let lost = false;
  await page.route("**/api/cashly/expenses/chat-batch", async route => {
    const response = await route.fetch();
    if (!lost) { lost = true; await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "Synthetic lost save response" } }) }); }
    else await route.fulfill({ response });
  });
  await page.getByRole("button", { name: /Simpan 1 pengeluaran/ }).click();
  const error = page.getByRole("dialog", { name: "Permintaan belum selesai", exact: true });
  await expect(error).toBeVisible();
  await error.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await page.getByRole("button", { name: /Simpan 1 pengeluaran/ }).click();
  await expect(page.getByText("Pengeluaran berhasil disimpan.", { exact: true })).toBeVisible();
  rows = (await (await page.request.get("/api/cashly/expenses")).json()).data;
  expect(rows).toHaveLength(2);
  expect(rows.find((row: { source: string }) => row.source === "voice")).toMatchObject({ merchant: "QA_LIVE_VN", amount_idr: "15000" });
  for (const row of rows) {
    const response = await page.request.delete(`/api/cashly/expenses/${row.id}`, { headers: { Origin: "http://127.0.0.1:34567", "Idempotency-Key": `qa-cleanup-${row.id}` } });
    expect(response.ok()).toBeTruthy();
  }
  expect((await (await page.request.get("/api/cashly/expenses")).json()).data).toHaveLength(0);
});
