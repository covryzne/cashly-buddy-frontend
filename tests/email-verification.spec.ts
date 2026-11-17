import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.afterAll(async ({ request }) => {
  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
});

test("signup OTP, resend cooldown, invalid code, verification and explicit login", async ({ page, context, request }) => {
  await request.get("http://127.0.0.1:34568/__test/otp");
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.getByLabel("Nama panggilan").fill("OTP Tester");
  await page.getByLabel("Email", { exact: true }).fill("otp@example.invalid");
  await page.getByLabel("Kata sandi", { exact: true }).fill("Test-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi", { exact: true }).fill("Test-Pass123!");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verifikasi email" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".otp-input-card .otp-digit")).toHaveCount(6);
  const paste = page.getByRole("button", { name: "Tempel OTP", exact: true });
  await expect(paste).toBeVisible();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { readText: async () => { throw new DOMException("Denied", "NotAllowedError"); } } }));
  await paste.click();
  await expect(page.locator(".email-verification").getByRole("alert")).toContainText("Clipboard belum dapat dibaca");
  await expect(page.getByLabel("Kode verifikasi", { exact: true })).toBeFocused();
  await expect(page.locator(".otp-expiry time")).toHaveText(/^(05:00|04:59)$/);
  const unverified = await request.post("/auth/email/login", {
    headers: { Origin: "http://127.0.0.1:34567" },
    data: { email: "otp@example.invalid", password: "Test-Pass123!" },
  });
  expect(unverified.status()).toBe(202);
  expect((await unverified.json()).status).toBe("verification_required");
  const resend = page.getByRole("button", { name: /Kirim ulang/ });
  await expect(resend).toBeDisabled();
  await page.clock.fastForward(61000);
  await expect(resend).toBeEnabled();
  await resend.click();
  await expect(resend).toBeDisabled();
  await expect(page.locator(".otp-expiry time")).toHaveText(/^(05:00|04:59)$/);
  await page.clock.resume();
  await page.getByLabel("Kode verifikasi", { exact: true }).fill("000000");
  await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
  await expect(page.locator(".email-verification").getByRole("alert")).toContainText("Kode tidak valid");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.clock.fastForward(301000);
  await expect(page.locator(".otp-expiry")).toContainText("Kode kedaluwarsa");
  await expect(page.getByRole("button", { name: "Verifikasi email", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Kode verifikasi", { exact: true })).toBeDisabled();
  await expect(paste).toBeDisabled();
  await request.get("http://127.0.0.1:34568/__test/resend-down?enabled=true");
  await resend.click();
  await expect(page.locator(".email-verification").getByRole("alert")).toContainText("belum tersedia");
  await expect(page.locator(".otp-expiry")).toContainText("Kode kedaluwarsa");
  await request.get("http://127.0.0.1:34568/__test/resend-down?enabled=false");
  await resend.click();
  await expect(page.locator(".otp-expiry time")).toHaveText(/^(05:00|04:59)$/);
  await expect(page.getByLabel("Kode verifikasi", { exact: true })).toBeEnabled();
  // Paste all digits, including whitespace introduced when selecting email tiles.
  await page.getByLabel("Kode verifikasi", { exact: true }).evaluate(input => {
    const clipboard = new DataTransfer();
    clipboard.setData("text/plain", "1 2 3\n4 5 6");
    input.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: clipboard }));
  });
  await expect(page.getByLabel("Kode verifikasi", { exact: true })).toHaveValue("123456");
  await expect(page.locator(".otp-digit")).toHaveText(["1", "2", "3", "4", "5", "6"]);
  await page.getByLabel("Kode verifikasi", { exact: true }).fill("");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { readText: async () => "1 2 3\n4 5 6" } }));
  await paste.click();
  await expect(page.getByLabel("Kode verifikasi", { exact: true })).toHaveValue("123456");
  await expect(page.locator(".otp-digit")).toHaveText(["1", "2", "3", "4", "5", "6"]);
  // Editing still uses a native input: keyboard navigation, delete and typing.
  await page.getByLabel("Kode verifikasi", { exact: true }).press("End");
  await page.getByLabel("Kode verifikasi", { exact: true }).press("Backspace");
  await expect(page.getByLabel("Kode verifikasi", { exact: true })).toHaveValue("12345");
  await page.getByLabel("Kode verifikasi", { exact: true }).press("6");
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      if (width === 390) {
        expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
        await page.locator(".email-verification").screenshot({ path: `test-results/otp-card-${theme}.png` });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".email-verification").screenshot({ path: "test-results/otp-five-minutes.png" });
  await page.getByRole("button", { name: "Verifikasi email", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Akun telah terverifikasi" });
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async element => { await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished)); });
  await dialog.screenshot({ path: "test-results/otp-verified-dialog.png" });
  expect((await context.cookies()).filter(cookie => cookie.name.startsWith("sb-") && cookie.value)).toHaveLength(0);
  await dialog.getByRole("button", { name: "Ke halaman login" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("otp@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Test-Pass123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/, { timeout: 30000 });
  for (const action of ["verify", "resend"]) {
    const rejected = await request.post(`/auth/email/${action}`, {
      headers: { Origin: "https://evil.invalid" }, data: { email: "otp@example.invalid", token: "123456" },
    });
    expect(rejected.status()).toBe(403);
  }
});
