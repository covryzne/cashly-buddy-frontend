import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe.configure({ mode: "serial" });
const email = "local-qa@example.invalid";
const password = "Local-Test123!";

test("local signup, account bootstrap, logout and password login without Google or mail", async ({ page, context, request }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toHaveCount(0);
  await expect(page.locator(".password-guide:visible")).toHaveCount(0);
  await expect(page.locator(".password-hint:visible")).toHaveCount(0);
  await page.getByRole("link", { name: "Buat akun" }).click();
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.locator(".login-form:visible").getByLabel("Nama panggilan")).toBeFocused();
  await expect(page.locator(".login-form:visible").getByLabel("Nama panggilan")).toHaveAttribute("placeholder", "Masukkan nama panggilanmu");
  await expect(page.locator(".login-form:visible").getByLabel("Email", { exact: true })).toHaveAttribute("placeholder", "nama@email.com");
  await page.locator(".login-form:visible").getByLabel("Nama panggilan").fill("Local Tester");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill(email);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.locator(".login-form:visible").getByLabel("Konfirmasi kata sandi", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  await expect(page.getByText("Konfirmasi kata sandi belum cocok.")).toBeVisible();
  await page.locator(".login-form:visible").getByLabel("Konfirmasi kata sandi", { exact: true }).fill(password);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Buat akun", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Akun berhasil dibuat" });
  await expect(dialog).toBeVisible();
  await dialog.evaluate(async element => {
    await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished));
  });
  expect((await context.cookies()).filter(cookie => cookie.name.startsWith("sb-") && cookie.value)).toHaveLength(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await dialog.getByRole("button", { name: "Ke halaman login" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill(email);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/, { timeout: 30000 });
  await expect(page.getByText("Local Tester", { exact: false }).first()).toBeVisible();
  const cookies = (await context.cookies()).filter(cookie => cookie.name.startsWith("sb-"));
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every(cookie => cookie.httpOnly && cookie.sameSite === "Lax")).toBeTruthy();
  await page.goto("/profil");
  await page.locator(".profile-logout").click();
  await page.locator(".profile-logout-confirm").click();
  await expect(page).toHaveURL(/\/login/);
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill(email);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Wrong-Pass999!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator(".login-form").getByRole("alert")).toHaveText("Email atau kata sandi tidak sesuai.");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls).toContain("/api/v1/auth/register");
  expect(state.calls).toContain("/api/v1/auth/login");
  expect(state.calls.some((path: string) => /authorize|recover|resend|otp/.test(path))).toBeFalsy();
});

test("email auth rejects cross-site requests and retains a bootstrap retry", async ({ page, request }) => {
  const rejected = await request.post("/auth/email/register", { headers: { Origin: "https://evil.invalid" }, data: { email, password } });
  expect(rejected.status()).toBe(403);
  await request.get("http://127.0.0.1:34568/__test/backend-down?enabled=true");
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill(email);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/complete/);
  await request.get("http://127.0.0.1:34568/__test/backend-down?enabled=false");
  await page.getByRole("button", { name: "Coba siapkan akun lagi" }).click();
  await expect(page).toHaveURL(/\/beranda/, { timeout: 30000 });
});


test("password composition validates before network requests", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/register");
  await page.locator(".login-form:visible").getByLabel("Nama panggilan").fill("Password Tester");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("policy@example.invalid");
  let requests = 0;
  page.on("request", request => { if (request.url().endsWith("/auth/email/register")) requests++; });
  for (const [password, message] of [
    ["Aa1!", "Kata sandi minimal 8 karakter."],
    ["lowercase123!", "Tambahkan minimal satu huruf besar."],
    ["UPPERCASE123!", "Tambahkan minimal satu huruf kecil."],
    ["NoDigitsHere!", "Tambahkan minimal satu angka."],
    ["NoSymbols123", "Tambahkan minimal satu simbol, misalnya ! @ #."],
    ["Ab1!xxxxxxxxxxxxx", "Kata sandi maksimal 16 karakter."],
  ]) {
    await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill(password);
    await page.locator(".login-form:visible").getByLabel("Konfirmasi kata sandi", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Buat akun", exact: true }).click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  expect(requests).toBe(0);
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("StrongPass123!");
  await expect(page.locator(".password-requirements li[data-met=true]")).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator(".auth-form-card").screenshot({ path: "test-results/register-validation-mobile.png" });
});
