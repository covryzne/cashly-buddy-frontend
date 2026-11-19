import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const authority = "http://127.0.0.1:34568";
const DB = "cashly-account-offline-v1";
const A = "20000000-0000-4000-8000-000000000001";
const B = "20000000-0000-4000-8000-000000000002";

async function stored(page: Page) {
  return page.evaluate(async name => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(name); open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
    });
    return new Promise<{ keys: IDBValidKey[]; values: unknown[] }>((resolve, reject) => {
      const tx = db.transaction("snapshots", "readonly"), store = tx.objectStore("snapshots");
      const keys = store.getAllKeys(), values = store.getAll();
      tx.oncomplete = () => { db.close(); resolve({ keys: keys.result, values: values.result }); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }, DB);
}
async function seed(request: APIRequestContext, name: string) {
  await request.get(authority + "/__test/chat");
  const response = await request.post(authority + "/api/v1/expenses/chat-batch", {
    headers: { "Idempotency-Key": name }, data: { records: [{ expense: {
      merchant: name, description: "Nasi Padang", category_code: "food_drink", amount_idr: "12500",
      occurred_at: new Date().toISOString(), payment_method: "qris", source: "text",
      items: [{ label: "Nasi Padang", quantity: 1, unit_price_idr: "12500" }],
    } }] },
  });
  expect(response.ok()).toBeTruthy();
}
async function login(page: Page) {
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("offline@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await expect(page.getByText("Salinan data tersimpan di perangkat ini.", { exact: true })).toBeVisible();
}
async function prepared(page: Page) {
  await expect.poll(async () => (await stored(page)).values.some((v: unknown) =>
    (v as { game?: { current_streak?: number } })?.game?.current_streak === 7)).toBe(true);
  await expect.poll(() => page.evaluate(async () => Boolean(await (await caches.open("cashly-offline-shell-v2-account")).match("/offline-shell-manifest"))), { timeout: 40000 }).toBe(true);
}

test.beforeEach(async ({ page, request }) => {
  await request.get(authority + "/__test/backend-down?enabled=false");
  await request.get(authority + "/__test/otp?enabled=false");
  await request.get(authority + "/__test/offline-account?name=A");
  const response = await request.post("/auth/email/register", {
    headers: { Origin: "http://127.0.0.1:34567" },
    data: { name: "Offline A", email: "offline@example.invalid", password: "Local-Test123!", confirmPassword: "Local-Test123!" },
  });
  expect(response.ok()).toBeTruthy();
  await seed(request, "Offline A Expense");
  await login(page); await prepared(page);
});

test("account data, profile and streak survive offline reload and navigation without API hits", async ({ page, context }) => {
  const state = await stored(page);
  expect(state.keys).toContain(A);
  const serialized = JSON.stringify(state.values);
  expect(serialized).not.toContain("access_token");
  expect(serialized).not.toContain("synthetic-refresh");
  expect(serialized).not.toContain("Local-Test123!");
  const shell = await page.evaluate(async () => {
    const cache = await caches.open("cashly-offline-shell-v2-account");
    return { html: await (await cache.match("/offline"))!.text(),
      paths: (await cache.keys()).map(request => new URL(request.url).pathname) };
  });
  expect(shell.html).not.toContain("Offline A Expense");
  expect(shell.html).not.toContain("offline@example.invalid");
  expect(shell.paths.some(path => /^\/(api|auth|beranda|aktivitas|laporan|profil)(\/|$)/.test(path))).toBe(false);
  const hits: string[] = [];
  await context.setOffline(true);
  page.on("request", request => { if (/\/api\/|\/auth\/session/.test(request.url())) hits.push(new URL(request.url()).pathname); });
  await page.reload();
  await expect(page.locator(".expense-summary .hero-amount")).toContainText("12.500");
  await expect(page.locator(".local-data-status")).toHaveAttribute("data-state", "offline");
  await expect(page.locator(".local-data-status time")).toBeVisible();
  for (const path of ["/aktivitas", "/laporan", "/profil", "/beranda"]) {
    if (path === "/profil") await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(path);
    await expect(page.locator(".local-data-status")).toHaveAttribute("data-state", "offline");
    await expect(page.getByText("Salinan data terakhir. Pencatatan dan perubahan tersedia saat online.")).toBeVisible();
    if (path === "/aktivitas") {
      await expect(page.locator(".transaction-row").filter({ hasText: "Offline A Expense" })).toBeVisible();
      await page.locator(".transaction-row").first().click();
      await expect(page.getByRole("button", { name: "Ubah detail", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
    }
    if (path === "/profil") await expect(page.getByText("Offline A", { exact: true }).first()).toBeVisible();
    if (path === "/profil") await expect(page.getByRole("button", { name: "Sapa Mochi", exact: true })).toHaveAttribute("data-scene-state", "poster");
  }
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("cashly-session-validated"));
  });
  expect(hits).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("offline-account.png"), fullPage: true });
});

test("open account stops fetches offline and revalidates once on reconnect", async ({ page, context }) => {
  await context.setOffline(true);
  const hits: string[] = [];
  page.on("request", request => { if (/\/api\/|\/auth\/session/.test(request.url())) hits.push(new URL(request.url()).pathname); });
  await page.clock.install(); await page.clock.fastForward(61000);
  await page.evaluate(() => window.dispatchEvent(new Event("cashly-session-validated")));
  expect(hits).toEqual([]);
  await page.clock.resume();
  await context.setOffline(false);
  await expect.poll(() => hits.filter(path => path === "/auth/session").length).toBe(1);
  await expect.poll(() => hits.filter(path => path === "/api/cashly/expenses").length).toBe(1);
  await expect.poll(() => hits.filter(path => path === "/api/cashly/gamification/overview").length).toBe(1);
});

test("offline shell validates session before reconnecting to the account", async ({ page, context }) => {
  await context.setOffline(true); await page.reload();
  await expect(page.locator(".local-data-status")).toHaveAttribute("data-state", "offline");
  await context.setOffline(false);
  await expect(page.getByRole("status", { name: "Status koneksi", exact: true })).toHaveAttribute("data-state", "online", { timeout: 20000 });
  await expect(page.locator(".expense-summary .hero-amount")).toContainText("12.500");
});

test("account switch clears A and ignores leftover snapshots from another owner", async ({ page, request }) => {
  const stale = (await stored(page)).values.find((v: unknown) => (v as { account?: { account_id?: string } })?.account?.account_id === A);
  await request.get(authority + "/__test/offline-account?name=B");
  await seed(request, "Offline B Expense");
  await page.goto("/beranda");
  await expect(page.getByText("Salinan data tersimpan di perangkat ini.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await stored(page)).keys.includes(A)).toBe(false);
  expect((await stored(page)).keys).toContain(B);
  await page.evaluate(async ({ dbName, old }) => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open(dbName); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>(resolve => { const tx = db.transaction("snapshots", "readwrite"); tx.objectStore("snapshots").put(old, "20000000-0000-4000-8000-000000000001"); tx.oncomplete = () => { db.close(); resolve(); }; });
  }, { dbName: DB, old: stale });
  await page.context().setOffline(true); await page.goto("/aktivitas");
  await expect(page.locator(".transaction-row").filter({ hasText: "Offline B Expense" })).toBeVisible();
  await expect(page.getByText("Offline A Expense", { exact: true })).toHaveCount(0);
});

test("client logout revokes cached data in another open offline shell", async ({ page, context }) => {
  const other = await context.newPage();
  await other.route("**/auth/session", route => route.fulfill({ status: 503, json: {} }));
  await other.goto("/offline");
  await expect(other.getByRole("heading", { name: "Cashly sedang offline" })).toBeVisible();
  await page.goto("/profil");
  await page.getByRole("button", { name: "Keluar dari akun", exact: true }).click();
  await page.locator(".profile-logout-confirm").click();
  await expect(page).toHaveURL(/\/login/);
  await expect.poll(async () => (await stored(page)).keys.length).toBe(0);
  await expect(other.getByRole("heading", { name: "Salinan data belum tersedia" })).toBeVisible();
  await other.close();
});

test("invalid owner data is rejected instead of showing another account or demo", async ({ page, context }) => {
  await page.evaluate(async dbName => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open(dbName); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>(resolve => {
      const tx = db.transaction("snapshots", "readwrite"), store = tx.objectStore("snapshots");
      const req = store.get("20000000-0000-4000-8000-000000000001");
      req.onsuccess = () => { req.result.account.account_id = "20000000-0000-4000-8000-000000000002"; store.put(req.result, "20000000-0000-4000-8000-000000000001"); };
      tx.oncomplete = () => { db.close(); resolve(); };
    });
  }, DB);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole("heading", { name: "Salinan data belum tersedia" })).toBeVisible();
  await expect(page.locator(".expense-summary")).toHaveCount(0);
});

test("expired session on reconnect removes private offline data", async ({ page, context }) => {
  await page.route("**/auth/session", route => route.fulfill({ status: 401, json: { authenticated: false } }));
  await context.setOffline(true); await page.reload();
  await expect(page.locator(".expense-summary .hero-amount")).toContainText("12.500");
  await context.setOffline(false);
  await expect(page).toHaveURL(/\/login/);
  await expect.poll(async () => (await stored(page)).keys.length).toBe(0);
});

test("opening the public offline route online returns to the app once", async ({ page }) => {
  let documents = 0;
  page.on("request", request => { if (request.isNavigationRequest()) documents++; });
  await page.goto("/offline");
  await expect(page).toHaveURL(/\/beranda/);
  await expect(page.getByRole("status", { name: "Status koneksi", exact: true })).toHaveAttribute("data-state", "online");
  expect(documents).toBe(2);
});

test("unavailable storage keeps the online app usable and fails closed offline", async ({ page, context }) => {
  await page.addInitScript(() => { indexedDB.open = () => { throw new Error("Storage disabled for test"); }; });
  await page.reload();
  await expect(page.locator(".expense-summary .hero-amount")).toContainText("12.500");
  await expect(page.getByText("Penyimpanan lokal gagal.", { exact: false })).toBeVisible();
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole("heading", { name: "Salinan data belum tersedia" })).toBeVisible();
  await expect(page.getByText("Penyimpanan perangkat belum dapat dibaca.", { exact: true })).toBeVisible();
});
