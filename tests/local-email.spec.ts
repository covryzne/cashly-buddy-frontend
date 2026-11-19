import { chromium, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe.configure({ mode: "serial" });
const email = "local-qa@example.invalid";
const password = "Local-Test123!";

test("local signup, account bootstrap, logout and password login without Google or mail", async ({ page, context, request }) => {
  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
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
  await expect(page.getByText("Kata sandi belum cocok", { exact: true })).toBeVisible();
  await page.locator(".login-form:visible").getByLabel("Konfirmasi kata sandi", { exact: true }).fill(password);
  await expect(page.getByText("Kata sandi cocok", { exact: true })).toBeVisible();
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
  const accountSettings = page.getByRole("region", { name: "Akun", exact: true });
  await expect(accountSettings.getByText("Disconnected", { exact: true })).toBeVisible();
  await expect(accountSettings.getByRole("button", { name: /Ganti kata sandi/ })).toBeVisible();
  await expect(accountSettings.getByRole("button", { name: /Buat kata sandi Cashly/ })).toHaveCount(0);
  await accountSettings.screenshot({ path: "test-results/account-email-only.png" });
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
  const confirmation = page.locator(".login-form:visible").getByLabel("Konfirmasi kata sandi", { exact: true });
  await confirmation.fill("StrongPass123!");
  await expect(page.getByText("Kata sandi cocok", { exact: true })).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-invalid", "false");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("StrongPass124!");
  await expect(page.getByText("Kata sandi belum cocok", { exact: true })).toBeVisible();
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await confirmation.fill("");
  await expect(page.locator(".password-match-feedback:visible")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.locator(".auth-form-card").screenshot({ path: "test-results/register-validation-mobile.png" });
});


test("returning to a tab validates the session without reloading the document", async ({ page }) => {
  await page.goto("/login");
  const form=page.locator(".login-form:visible");
  await form.getByLabel("Email",{exact:true}).fill(email);
  await form.getByLabel("Kata sandi",{exact:true}).fill(password);
  await page.getByRole("button",{name:"Masuk",exact:true}).click();
  await expect(page).toHaveURL(/\/beranda/);
  await expect(page.locator("html")).toHaveAttribute("data-cashly-auth-ready","true");
  await page.evaluate(()=>{Object.assign(window,{cashlyDocumentProbe:"keep-this-document"});});
  const checked=page.waitForResponse(response=>response.url().endsWith("/auth/session"));
  await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  expect((await checked).status()).toBe(200);
  expect(await page.evaluate(()=>Reflect.get(window,"cashlyDocumentProbe"))).toBe("keep-this-document");
  await page.getByRole("link",{name:"Aktivitas",exact:true}).click();
  await expect(page).toHaveURL(/\/aktivitas/);
  expect(await page.evaluate(()=>Reflect.get(window,"cashlyDocumentProbe"))).toBe("keep-this-document");
  // Temporary validation failure must not log out an otherwise active account.
  await page.route("**/auth/session",route=>route.fulfill({status:503,contentType:"application/json",body:"{}"}));
  const unavailable=page.waitForResponse(response=>response.url().endsWith("/auth/session"));
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  expect((await unavailable).status()).toBe(503);
  expect(await page.evaluate(()=>Reflect.get(window,"cashlyDocumentProbe"))).toBe("keep-this-document");
  await expect(page).toHaveURL(/\/aktivitas/);
  // An actually expired/revoked session still returns to login.
  await page.route("**/auth/session",route=>route.fulfill({status:401,contentType:"application/json",body:"{}"}));
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true})));
  await expect(page).toHaveURL(/\/login/);
});


test("PWA launch restores a valid login after closing and reopening Chrome", async ({ request, baseURL }, testInfo) => {
  const origin = baseURL!;
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  const launchUrl = new URL(manifest.start_url, origin).href;
  const guest = await request.get(launchUrl, { maxRedirects: 0 });
  expect(guest.status()).toBe(307);
  expect(new URL(guest.headers().location, launchUrl).href).toBe(`${origin}/login`);

  await request.get("http://127.0.0.1:34568/__test/otp?enabled=false");
  const profile = testInfo.outputPath("pwa-chrome-profile");
  const open = () => chromium.launchPersistentContext(profile, { channel: "chrome", headless: true });
  const initial = await open();
  try {
    const auth = { email: "pwa-reopen@example.invalid", password };
    const headers = { Origin: origin };
    const registration = await initial.request.post(`${origin}/auth/email/register`, {
      headers, data: { ...auth, name: "PWA Tester", confirmPassword: password },
    });
    expect(registration.status()).toBe(201);
    const login = await initial.request.post(`${origin}/auth/email/login`, { headers, data: auth });
    expect(login.ok()).toBeTruthy();
  } finally {
    await initial.close();
  }

  const reopened = await open();
  try {
    const landing = await reopened.request.get(launchUrl, { maxRedirects: 0 });
    expect(landing.status()).toBe(307);
    expect(new URL(landing.headers().location, launchUrl).href).toBe(`${origin}/beranda`);
    expect(landing.headers()["cache-control"]).toBe("private, no-store");
    const page = reopened.pages()[0] ?? await reopened.newPage();
    await page.goto(launchUrl);
    await expect(page).toHaveURL(`${origin}/beranda`);

    await request.post("http://127.0.0.1:34568/auth/v1/logout");
    const revoked = await reopened.request.get(launchUrl, { maxRedirects: 0 });
    expect(revoked.status()).toBe(307);
    expect(new URL(revoked.headers().location, launchUrl).href).toBe(`${origin}/login`);
  } finally {
    await reopened.close();
  }
});
