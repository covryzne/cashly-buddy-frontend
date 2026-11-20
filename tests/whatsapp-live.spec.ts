import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });
for (const theme of ["light", "dark"] as const) test(`account linking, errors, refresh and disconnect ${theme}`, async ({ page, request }) => {
  await page.emulateMedia({ colorScheme: theme });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let connected = false, pending = false, unavailable = false, verificationCalls = 0;
  const challenge = { id: "10000000-0000-4000-8000-000000000001", state: "otp_sent", expires_at: new Date(Date.now()+300000).toISOString(), resend_at: new Date(Date.now()+60000).toISOString(), attempts_remaining: 5, masked_number: "•••• 1111", chat_url: "https://wa.me/628111111110?text=SYNTHETIC" };
  await page.route("**/api/cashly/me/whatsapp**", async route => {
    const path = new URL(route.request().url()).pathname;
    let status = 200, data: unknown;
    if (unavailable) return route.fulfill({ status: 503, json: { error: { message: "Status WhatsApp belum tersedia. Coba lagi." } } });
    if (path.endsWith("/challenges")) { pending = true; data = challenge; }
    else if (path.endsWith("/verify")) {
      verificationCalls++;
      if (route.request().postDataJSON().code !== "654321") { challenge.attempts_remaining--; status = 422; }
      else { connected = true; pending = false; }
    } else if (route.request().method() === "DELETE") { connected = false; pending = false; }
    data ??= { status: connected ? "connected" : "not_linked", masked_number: connected ? "•••• 1111" : null, connected_at: connected ? new Date().toISOString() : null, challenge: pending ? challenge : null, recording_available: false };
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
  await dialog.getByRole("button", { name: "Buka WhatsApp", exact: true }).click();
  await expect(dialog.getByLabel("Kode OTP", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Minta kode baru dalam/ })).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog.getByLabel("Kode OTP", { exact: true })).toBeVisible();
  await dialog.getByLabel("Kode OTP", { exact: true }).fill("123456");
  await dialog.getByRole("button", { name: "Verifikasi dan sambungkan" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Kode OTP tidak sesuai.");
  await expect(dialog).toContainText("4 percobaan tersisa");
  await dialog.getByLabel("Kode OTP", { exact: true }).fill("654321");
  await dialog.getByRole("button", { name: "Verifikasi dan sambungkan" }).click();
  await expect(dialog.getByRole("heading", { name: "WhatsApp terhubung", level: 3 })).toBeVisible();
  await expect(dialog).toContainText("Pencatatan WhatsApp masih disiapkan");
  await page.reload();
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog).toContainText("•••• 1111");
  expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual([]);
  await dialog.screenshot({ path: test.info().outputPath("whatsapp-connected.png") });
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  await dialog.getByRole("button", { name: "Putuskan koneksi", exact: true }).click();
  await dialog.getByRole("button", { name: "Batal", exact: true }).click();
  expect(connected).toBeTruthy();
  await dialog.getByRole("button", { name: "Putuskan koneksi", exact: true }).click();
  await dialog.getByRole("button", { name: "Ya, putuskan koneksi", exact: true }).click();
  await expect(dialog.getByText("Hubungkan WhatsApp kamu", { exact: true })).toBeVisible();
  challenge.state = "locked"; challenge.attempts_remaining = 0; pending = true;
  await page.reload();
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog.getByLabel("Kode OTP", { exact: true })).toBeDisabled();
  await expect(dialog).toContainText("Kode sudah berakhir");
  await page.context().setOffline(true);
  await expect(dialog).toContainText("Penautan dan verifikasi WhatsApp memerlukan koneksi internet");
  await page.context().setOffline(false);
  unavailable = true;
  await page.reload();
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog.getByRole("alert")).toContainText("belum tersedia");
  expect(verificationCalls).toBe(2);
  expect(errors).toEqual([]);
});
