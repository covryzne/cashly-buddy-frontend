import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });
for (const theme of ["light", "dark"] as const) test(`account linking, errors, refresh and disconnect ${theme}`, async ({ page, request }) => {
  await page.emulateMedia({ colorScheme: theme });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let connected = false, pending = false, unavailable = false, verificationCalls = 0, historyUnavailable = false;
  let connectedAt: string | null = null;
  const entries: { id: string; event: "linked" | "disconnected"; occurred_at: string; masked_number: string; source: "action" | "existing_connection" }[] = [];
  const challenge = { id: "10000000-0000-4000-8000-000000000001", state: "otp_sent", expires_at: new Date(Date.now()+300000).toISOString(), resend_at: new Date(Date.now()+60000).toISOString(), attempts_remaining: 5, masked_number: "•••• 1111", chat_url: "https://wa.me/628111111110?text=SYNTHETIC" };
  await page.route("**/api/cashly/me/whatsapp**", async route => {
    const path = new URL(route.request().url()).pathname;
    let status = 200, data: unknown;
    if (unavailable) return route.fulfill({ status: 503, json: { error: { message: "Status WhatsApp belum tersedia. Coba lagi." } } });
    if (path.endsWith("/history")) {
      if (historyUnavailable) return route.fulfill({ status: 503, json: { error: { message: "Riwayat belum tersedia." } } });
      const query = new URL(route.request().url()).searchParams;
      expect(query.get("limit")).toBe("1");
      expect(query.get("event")).toBe("linked");
      return route.fulfill({ json: { data: entries.filter(entry => entry.event === "linked").slice(0, 1), next_cursor: "older" } });
    }
    if (path.endsWith("/challenges")) { pending = true; data = challenge; }
    else if (path.endsWith("/verify")) {
      verificationCalls++;
      if (route.request().postDataJSON().code !== "654321") { challenge.attempts_remaining--; status = 422; }
      else {
        connected = true; pending = false; connectedAt = "2026-11-20T17:02:00Z";
        entries.unshift({ id: "20000000-0000-4000-8000-000000000001", event: "linked", occurred_at: connectedAt, masked_number: "•••• 1111", source: "action" });
      }
    } else if (route.request().method() === "DELETE") {
      if (connected) entries.unshift({ id: "20000000-0000-4000-8000-000000000099", event: "disconnected", occurred_at: "2026-11-20T17:08:00Z", masked_number: "•••• 1111", source: "action" });
      connected = false; pending = false; connectedAt = null;
    }
    data ??= { status: connected ? "connected" : "not_linked", masked_number: connected ? "•••• 1111" : null, connected_at: connectedAt, challenge: pending ? challenge : null, recording_available: false };
    await route.fulfill({ status, json: status === 200 ? { data } : { error: { message: "Kode OTP tidak sesuai." } } });
  });
  // Prevent a real WhatsApp navigation while testing the user gesture/popup path.
  await page.addInitScript(() => { window.open = () => null; });
  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
  const registration = await request.post("/auth/email/register", { headers: { Origin: "http://127.0.0.1:34567" }, data: { name: "WA Tester", email: "wa-test@example.invalid", password: "Local-Test123!", confirmPassword: "Local-Test123!" } });
  expect(registration.ok()).toBeTruthy();
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("wa-test@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Password", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Gas, masuk!", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.goto("/profil");
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Hubungkan WhatsApp kamu", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Belum ada riwayat koneksi WhatsApp yang tercatat.")).toBeVisible();
  await dialog.getByRole("button", { name: "Buka WhatsApp", exact: true }).click();
  await expect(dialog.getByLabel("Kode OTP", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Minta kode baru dalam/ })).toBeDisabled();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog.getByLabel("Kode OTP", { exact: true })).toBeVisible();
  await dialog.getByLabel("Kode OTP", { exact: true }).fill("123456");
  await dialog.getByRole("button", { name: "Verifikasi dan sambungkan" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Kode OTP tidak sesuai.");
  await expect(dialog).toContainText("4 percobaan tersisa");
  await dialog.getByLabel("Kode OTP", { exact: true }).fill("654321");
  await dialog.getByRole("button", { name: "Verifikasi dan sambungkan" }).click();
  await expect(dialog.getByRole("heading", { name: "WhatsApp terhubung", level: 2 })).toBeVisible();
  await expect(dialog.getByRole("region", { name: "Nomor WhatsApp" })).toContainText("Terverifikasi");
  await expect(dialog).toContainText("Pencatatan WhatsApp masih disiapkan");
  const summary = dialog.getByRole("region", { name: "Terakhir terhubung", exact: true });
  await expect(summary).toHaveCount(0);
  await expect(dialog.locator("time")).toHaveText(/21 Nov 2026.*00[.:]02.*WIB/);
  await expect(dialog).toContainText("Terhubung sejak");
  await dialog.screenshot({ path: test.info().outputPath("whatsapp-connected.png") });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog).toContainText("•••• 1111");
  await expect(dialog.locator("time")).toHaveText(/00[.:]02.*WIB/);
  expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await dialog.getByRole("button", { name: "Putuskan koneksi", exact: true }).click();
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  expect(connected).toBeTruthy();
  await dialog.getByRole("button", { name: "Putuskan koneksi", exact: true }).click();
  historyUnavailable = true;
  await dialog.getByRole("button", { name: "Ya, putuskan koneksi", exact: true }).click();
  await expect(dialog.getByText("Hubungkan WhatsApp kamu", { exact: true })).toBeVisible();
  await expect(summary.getByRole("status")).toHaveText("Riwayat koneksi belum dapat dimuat.");
  historyUnavailable = false;
  await summary.getByRole("button", { name: "Coba muat lagi" }).click();
  await expect(summary.locator("time")).toHaveText(/21 Nov 2026.*00[.:]02.*WIB/);
  await expect(summary.getByRole("button", { name: "Lihat riwayat sebelumnya" })).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(summary.locator("time")).toHaveText(/21 Nov 2026.*00[.:]02.*WIB/);
  await dialog.screenshot({ path: test.info().outputPath("whatsapp-disconnected-history.png") });
  challenge.state = "locked"; challenge.attempts_remaining = 0; pending = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog.getByLabel("Kode OTP", { exact: true })).toBeDisabled();
  await expect(dialog).toContainText("Kode sudah berakhir");
  await page.context().setOffline(true);
  await expect(dialog).toContainText("Penautan dan verifikasi WhatsApp memerlukan koneksi internet");
  await page.context().setOffline(false);
  unavailable = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("belum tersedia");
  expect(verificationCalls).toBe(2);
  expect(errors).toEqual([]);
});
