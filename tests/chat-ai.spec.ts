import { test, expect, type Page } from "@playwright/test";

test.use({ reducedMotion: "reduce" });
async function openChat(page: Page) {
  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("button", { name: /Chat manual/ }).click();
}
async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill(text);
  const response = page.waitForResponse(result => result.url().endsWith("/api/cashly/chat/extract"));
  await page.getByRole("button", { name: "Kirim catatan" }).click();
  await response;
  await expect(page.getByRole("textbox", { name: "Catatan pengeluaran" })).toBeEnabled();
}
test.beforeEach(async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
  await request.get("http://127.0.0.1:34568/__test/chat");
  const registration = await request.post("/auth/email/register", {
    headers: { Origin: "http://127.0.0.1:34567" },
    data: { name: "Chat Tester", email: "chat-test@example.invalid", password: "Local-Test123!", confirmPassword: "Local-Test123!" },
  });
  expect(registration.ok()).toBeTruthy();
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("chat-test@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await openChat(page);
});

test("clarify, correct, add, preview, edit and commit only on confirmation", async ({ page, request }) => {
  await send(page, "beli kopi");
  await expect(page.getByText("Kopinya berapa?", { exact: true })).toBeVisible();
  await send(page, "18rb");
  await expect(page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ })).toContainText("18.000");
  await send(page, "kopi tadi jadi 20rb");
  await expect(page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ })).toContainText("20.000");
  await send(page, "bensin 30rb");
  await send(page, "buat kode Python");
  await expect(page.getByRole("button", { name: /^Tinjau 2 pengeluaran/ })).toContainText("50.000");
  const before = await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json();
  expect(before.commits).toBe(0);
  await page.getByRole("button", { name: /^Tinjau 2 pengeluaran/ }).click();
  await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Ubah/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Rincian pengeluaran", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Selesai mengubah" }).click();
  await page.getByRole("button", { name: /Ubah pengeluaran 1/ }).click();
  await page.getByRole("button", { name: "Ubah pesan", exact: true }).click();
  await page.locator("#chat-entry-source").fill("kopi 20rb");
  await page.getByRole("button", { name: "Terapkan catatan" }).click();
  await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Konfirmasi 2 pengeluaran/ }).click();
  await expect(page.getByText("Pengeluaran berhasil disimpan ke Cashly.")).toBeVisible();
  const after = await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json();
  expect(after.commits).toBe(1);
  expect(after.saved).toHaveLength(2);
  expect(after.saved.map((row: {amount_idr:string}) => row.amount_idr)).toEqual(["20000", "30000"]);
});

test("provider failure preserves input; close while pending discards stale response", async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/chat?fail=true");
  await send(page, "kopi 18rb");
  await expect(page.getByRole("dialog", { name: "Chat manual", exact: true }).getByRole("alert")).toContainText("Kuota AI");
  await expect(page.getByRole("textbox", { name: "Catatan pengeluaran" })).toHaveValue("kopi 18rb");
  await expect(page.locator(".expense-message-user")).toHaveCount(1);
  await expect(page.getByText("Mochi sedang mengetik…", { exact: true })).toHaveCount(0);
  await send(page, "kopi 18rb");
  await expect(page.locator(".expense-message-user")).toHaveCount(1);
  await request.get("http://127.0.0.1:34568/__test/chat?slow=true");
  await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill("bensin 30rb");
  await page.getByRole("button", { name: "Kirim catatan" }).click();
  await expect(page.getByText("Mochi sedang membaca catatanmu…")).toBeVisible();
  await expect(page.getByText("Mochi sedang mengetik…", { exact: true })).toBeVisible();
  await expect(page.locator(".expense-message-user").last()).toContainText("bensin 30rb");
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await openChat(page);
  await expect(page.getByRole("textbox", { name: "Catatan pengeluaran" })).toHaveValue("bensin 30rb");
  await expect.poll(async () => (await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json()).extractions).toBe(1);
  await expect(page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ })).toBeVisible();
});

test("user bubble and typing indicator appear before the provider responds", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/cashly/chat/extract", async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill("kopi 18rb");
    await page.getByRole("button", { name: "Kirim catatan" }).click();
    await expect(page.locator(".expense-message-user")).toHaveText(/kopi 18rb/);
    await expect(page.getByText("Mochi sedang mengetik…", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kirim catatan" })).toBeDisabled();
  } finally { release(); }
  await expect(page.getByRole("textbox", { name: "Catatan pengeluaran" })).toBeEnabled();
  await expect(page.getByText("Mochi sedang mengetik…", { exact: true })).toHaveCount(0);
  await expect(page.locator(".expense-message-user")).toHaveCount(1);
});

test("activity edit uses canonical PATCH response without full-list or game refresh", async ({ page, request }) => {
  const id = "30000000-0000-4000-8000-000000000009";
  const row = { id, merchant: "Makan Siang", description: "Nasi", category_code: "food_drink",
    amount_idr: "25000", occurred_at: new Date().toISOString(), payment_method: "cash",
    discount_idr: "0", tax_idr: "0", source: "dashboard", version: 1,
    items: [{ item_index: 0, label: "Nasi", quantity: 1, unit_price_idr: "25000", amount_idr: "25000" }] };
  const seeded = await request.post("http://127.0.0.1:34568/api/v1/expenses/chat-batch", {
    headers: { "Idempotency-Key": id }, data: { records: [{ expense: row }] },
  });
  row.id = (await seeded.json()).data[0].id;
  await page.goto("/aktivitas");
  await page.locator(".transaction-row").filter({ hasText: "Makan Siang" }).click();
  let reads = 0;
  const versions: number[] = [];
  await page.route("**/api/cashly/expenses**", async route => {
    if (route.request().method() !== "PATCH") { reads++; await route.continue(); return; }
    const body = route.request().postDataJSON(); versions.push(body.version);
    await route.fulfill({ json: { data: { ...row, ...body, version: body.version + 1,
      items: body.items.map((item: { label: string; quantity: number; unit_price_idr: string }, index: number) => ({
        ...item, item_index: index, amount_idr: String(item.quantity * Number(item.unit_price_idr)),
      })),
    } } });
  });
  await page.route("**/api/cashly/gamification/overview", async route => { reads++; await route.continue(); });
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole("button", { name: "Ubah detail", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Ubah pengeluaran", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Simpan perubahan", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Ubah pengeluaran", exact: true })).toHaveCount(0);
  }
  expect(versions).toEqual([1, 2]);
  expect(reads).toBe(0);
});

test("uncertain save retries the same batch without another commit", async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/chat?saveFailOnce=true");
  await send(page, "kopi 18rb");
  await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  const error = page.getByRole("dialog", { name: "Permintaan belum selesai", exact: true });
  await expect(error).toBeVisible();
  await error.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  await expect(page.getByText("Pengeluaran berhasil disimpan ke Cashly.")).toBeVisible();
  expect((await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json()).commits).toBe(1);
});

test("saved batch remains successful when summary refresh fails", async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/chat?refreshFail=true");
  await send(page, "kopi 18rb");
  await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  await expect(page.getByText("Pengeluaran berhasil disimpan ke Cashly.")).toBeVisible();
  expect((await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json()).commits).toBe(1);
});

test("fresh navigation and session validation reuse streak and summary; activity never loads streak", async ({ page, request }) => {
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await expect.poll(async () => (await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json()).gameReads).toBe(1);
  const start = await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json();
  await page.locator('a[href="/aktivitas"]:visible').click();
  await expect(page).toHaveURL(/\/aktivitas/);
  await page.evaluate(() => window.dispatchEvent(new Event("cashly-session-validated")));
  await page.locator('a[href="/profil"]:visible').click();
  await expect(page).toHaveURL(/\/profil/);
  await page.locator('a[href="/beranda"]:visible').click();
  await expect(page).toHaveURL(/\/beranda/);
  await expect(page.locator(".expense-summary")).toBeVisible();
  const end = await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json();
  expect(end.gameReads).toBe(start.gameReads);
  expect(end.expenseReads).toBe(start.expenseReads);
  expect(end.summaryReads).toBe(start.summaryReads);

  await request.get("http://127.0.0.1:34568/__test/chat");
  await page.goto("/aktivitas");
  await expect(page.locator(".activity-page")).toBeVisible();
  const direct = await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json();
  expect(direct.gameReads).toBe(0);
});

test("expired cache revalidates on session validation without refetching unchanged summary", async ({ page, request }) => {
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  const state = async () => (await (await request.get("http://127.0.0.1:34568/__test/chat-state")).json());
  await expect.poll(async () => (await state()).gameReads).toBe(1);
  await expect.poll(async () => (await state()).summaryReads).toBe(1);
  const start = await state();
  await page.clock.install();
  await page.clock.fastForward(61000);
  const reads = [page.waitForResponse(r => r.url().endsWith("/api/cashly/expenses")),
    page.waitForResponse(r => r.url().endsWith("/api/cashly/gamification/overview"))];
  await page.evaluate(() => window.dispatchEvent(new Event("cashly-session-validated")));
  await Promise.all(reads);
  await expect.poll(async () => (await state()).expenseReads).toBe(start.expenseReads + 1);
  await expect.poll(async () => (await state()).gameReads).toBe(start.gameReads + 1);
  expect((await state()).summaryReads).toBe(start.summaryReads);
});
