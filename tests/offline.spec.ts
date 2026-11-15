import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ timezoneId: "Asia/Jakarta", viewport: { width: 390, height: 844 } });
test.setTimeout(60000);

async function prepare(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00+07:00"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/aktivitas");
  await expect(page.locator(".activity-total-row > .money")).toHaveText("Rp1.248.500");
  await expect(page.getByRole("status").filter({ hasText: /^Online$/ })).toBeVisible();
  await expect(page.locator(".local-data-status time")).toHaveCount(0);
  await expect.poll(() => page.evaluate(async () => Boolean(await (await caches.open("cashly-offline-shell-v1")).match("/offline-shell-manifest"))), { timeout: 40000 }).toBe(true);
  const keys = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(key => new URL(key.url).pathname)))).flat());
  expect(keys).toContain("/offline");
  expect(keys.some(path => /^\/(api|login|register|beranda|aktivitas|laporan|profil)(\/|$)/.test(path))).toBe(false);
}

test("real offline reopen: persisted edit, all pages, read-only actions and reconnect", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page);
  const dialog = page.getByRole("dialog");
  await page.locator(".transaction-row-timeline").first().click();
  await dialog.getByRole("button", { name: "Ubah detail" }).click();
  await dialog.getByLabel("Harga satuan item 1").fill("35000");
  await dialog.getByRole("button", { name: "Simpan perubahan" }).click();
  await dialog.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await expect(page.locator(".activity-total-row > .money")).toHaveText("Rp1.255.500");
  await page.reload();
  await expect(page.locator(".activity-total-row > .money")).toHaveText("Rp1.255.500");
  await context.setOffline(true);
  await expect(page.locator(".local-data-status")).toHaveAttribute("data-state", "offline");
  const timestamp = await page.locator(".local-data-status time").getAttribute("datetime");
  // A new tab has no Next router memory or in-memory React records.
  const offline = await context.newPage();
  offline.on("pageerror", error => errors.push(error.message));
  await offline.goto("/beranda");
  await expect(offline.locator(".hero-amount")).toHaveText("Rp1.255.500");
  await expect(offline.locator(".local-data-status > span")).toHaveText("Offline");
  await offline.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Aktivitas", exact: true }).click();
  await expect(offline.locator(".transaction-row-timeline")).toHaveCount(6);
  await offline.locator(".transaction-row-timeline").first().click();
  await expect(offline.getByRole("button", { name: "Ubah detail" })).toBeDisabled();
  await expect(offline.getByRole("button", { name: "Hapus", exact: true })).toBeDisabled();
  await offline.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await offline.getByRole("navigation", { name: "Navigasi utama" }).getByRole("button", { name: "Catat pengeluaran" }).click();
  await offline.getByRole("dialog").getByRole("button", { name: /Chat manual/ }).click();
  await expect(offline.getByRole("dialog")).toHaveAccessibleName("Perlu koneksi internet");
  await offline.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await offline.getByRole("navigation", { name: "Navigasi utama" }).getByRole("link", { name: "Laporan", exact: true }).click();
  await expect(offline.locator(".local-data-status time")).toHaveAttribute("datetime", timestamp!);
  await expect(offline.locator(".reports-main")).toBeVisible();
  await expect.poll(() => offline.locator('.reports-main img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)) ).toBe(true);
  expect(await offline.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page: offline }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  await offline.screenshot({ path: "test-results/offline-reports-mobile.png", fullPage: true });
  await offline.goto("/profil");
  await expect(offline.getByRole("heading", { name: "Profil Akun", exact: true })).toBeVisible();
  await context.setOffline(false);
  await expect(offline.locator(".local-data-status")).toHaveAttribute("data-state", "online");
  await expect(offline.locator(".local-data-status time")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("confirmed chat persists across reload and repeated confirmation creates one expense", async ({ page }) => {
  await prepare(page);
  await page.goto("/beranda");
  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Chat manual/ }).click();
  await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill("kopi 20k");
  await page.getByRole("button", { name: "Kirim catatan" }).click();
  await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Pratinjau pengeluaran");
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName("Konfirmasi pengeluaran");
  await page.getByRole("dialog").getByRole("button", { name: "Kembali", exact: true }).click();
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await expect(page.locator(".hero-amount")).toHaveText("Rp1.268.500");
  await page.goto("/aktivitas");
  await expect(page.locator(".transaction-row-timeline")).toHaveCount(7);
  await page.reload();
  await expect(page.locator(".transaction-row-timeline")).toHaveCount(7);
  await expect(page.locator(".activity-total-row > .money")).toHaveText("Rp1.268.500");
});

test("corrupt snapshot is discarded rather than used as financial data", async ({ page, context }) => {
  await prepare(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => {
      const request = indexedDB.open("cashly-demo-offline-v1", 1);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite");
      tx.objectStore("snapshots").put({ version: 99, owner: "other-account", expenses: [] }, "fictional-demo");
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Data belum tersedia di perangkat" })).toBeVisible();
  await expect(page.locator(".activity-total-row")).toHaveCount(0);
});

test("missing local snapshot never turns into zero spending or fabricated history", async ({ page, context }) => {
  await prepare(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("cashly-demo-offline-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite");
      tx.objectStore("snapshots").clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    });
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Data belum tersedia di perangkat" })).toBeVisible();
  await expect(page.locator(".transaction-row-timeline")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Buka pratinjau online" })).toBeDisabled();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Buka pratinjau online" }).click();
  await expect(page.locator(".hero-amount")).toHaveText("Rp1.248.500");
});

test("logout clears snapshot and invalidates other open tabs", async ({ page, context }) => {
  await prepare(page);
  const other = await context.newPage();
  await other.goto("/beranda");
  await expect(other.locator(".hero-amount")).toBeVisible();
  await page.goto("/profil");
  await page.getByRole("button", { name: "Keluar dari akun" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(other.getByRole("heading", { name: "Data belum tersedia di perangkat" })).toBeVisible();
  await context.setOffline(true);
  await other.reload();
  await expect(other.getByRole("heading", { name: "Data belum tersedia di perangkat" })).toBeVisible();
});

test("storage failure stays usable online and honestly unavailable after offline reload", async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { get() { throw new Error("Storage unavailable"); } });
  });
  await page.goto("/aktivitas");
  await expect(page.locator(".transaction-row-timeline")).toHaveCount(6);
  await expect(page.getByText(/Data hanya tersedia selama sesi ini/)).toBeVisible();
  await expect.poll(() => page.evaluate(async () => Boolean(await (await caches.open("cashly-offline-shell-v1")).match("/offline-shell-manifest"))), { timeout: 40000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Data belum tersedia di perangkat" })).toBeVisible();
});
