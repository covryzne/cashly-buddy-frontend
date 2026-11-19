import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("protected pages, Google PKCE callback, account reads and logout without SMTP", async ({ page, context, request }) => {
  await page.goto("/beranda");
  await expect(page).toHaveURL(/\/login/);
  const crossSite = await request.post("/auth/google", { headers: { Origin: "https://evil.invalid" }, maxRedirects: 0 });
  expect(crossSite.status()).toBe(403);
  // Email now reaches the backend; invalid credentials return 401 rather than a UI-mode gate.
  expect((await request.post("/auth/email/login", { headers: { Origin: "http://127.0.0.1:34567" }, data: { email: "test@example.invalid", password: "Test-Pass123!" } })).status()).toBe(401);
  await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/beranda/, { timeout: 30000 });
  await expect(page.getByRole("status").filter({ hasText: "Online" })).toBeVisible();
  await expect(page.getByText("OAuth Tester", { exact: false }).first()).toBeVisible();
  const cookies = (await context.cookies()).filter(cookie => cookie.name.startsWith("sb-"));
  expect(cookies.length).toBeGreaterThan(0);
  expect(cookies.every(cookie => cookie.httpOnly && cookie.sameSite === "Lax")).toBeTruthy();
  expect(await page.evaluate(() => Object.keys(localStorage).some(key => key.startsWith("sb-")))).toBeFalsy();
  const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls).toContain("/auth/v1/token");
  expect(state.calls).toContain("/api/v1/auth/bootstrap");
  expect(state.calls.some((path: string) => /signup|recover|resend|otp/.test(path))).toBeFalsy();
  const second = await context.newPage();
  await second.goto("/aktivitas");
  await page.bringToFront();
  await page.goto("/profil");
  await page.locator(".profile-logout").click();
  await page.locator(".profile-logout-confirm").click();
  await expect(page).toHaveURL(/\/login/);
  await expect(second).toHaveURL(/\/login/);
});

test("provider cancellation and backend failure retain a safe retry path", async ({ page, request }) => {
  await page.goto("/auth/callback?error=access_denied&error_description=private-detail&next=https://evil.invalid");
  await expect(page).toHaveURL(/\/auth\/complete/);
  await expect(page.getByText("private-detail")).toHaveCount(0);
  await request.get("http://127.0.0.1:34568/__test/backend-down?enabled=true");
  await page.goto("/login");
  await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/auth\/complete/);
  await request.get("http://127.0.0.1:34568/__test/backend-down?enabled=false");
  const retry = page.waitForResponse(response => new URL(response.url()).pathname === "/auth/bootstrap");
  await page.getByRole("button", { name: "Coba siapkan akun lagi" }).click();
  expect((await retry).status()).toBe(303);
  await expect(page).toHaveURL(/\/beranda/, { timeout: 30000 });
});
