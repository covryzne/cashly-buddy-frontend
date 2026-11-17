import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/profile-mode");
  await page.goto("/login");
  await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/beranda/);
});

for (const scenario of ["same", "mismatch", "cancel", "disabled", "switched"]) {
  test(`Google linking ${scenario} preserves the Cashly account`, async ({ page, request, context }) => {
    await request.get(`http://127.0.0.1:34568/__test/link-mode?case=${scenario}`);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto("/profil");
    if (scenario === "same") await page.locator(".account-google-row").screenshot({ path: "test-results/google-inline-action.png" });
    const before = await (await context.request.get("/auth/session")).json();
    const csrf = await context.request.post("/auth/google/connect", { headers: { Origin: "https://evil.invalid" }, maxRedirects: 0 });
    expect(csrf.status()).toBe(403);
    await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Hubungkan Google", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("oauth-test@example.invalid");
    await page.getByRole("button", { name: "Lanjutkan ke Google" }).click();
    if (scenario === "switched") {
      await expect(page).toHaveURL(/\/login/);
      expect((await context.cookies()).filter(cookie => cookie.name.startsWith("sb-") && cookie.value)).toHaveLength(0);
      const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
      expect(state.calls).not.toContain("/api/v1/auth/bootstrap");
      return;
    }
    const dialog = page.getByRole("dialog");
    if (scenario === "same") {
      await expect(dialog.getByRole("heading", { name: "Google berhasil terhubung" })).toBeVisible();
      await dialog.getByRole("button", { name: "Mengerti" }).click();
      await expect(page.getByText("Connected", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Hubungkan Google", exact: true })).toHaveCount(0);
    } else {
      await expect(dialog.getByRole("heading", { name: "Koneksi Google belum selesai" })).toBeVisible();
      if (scenario === "mismatch") await expect(dialog).toContainText("Email Google berbeda");
      if (scenario === "disabled") await expect(dialog).toContainText("Google belum tersedia");
      await dialog.getByRole("button", { name: "Mengerti" }).click();
      await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();
    }
    const after = await (await context.request.get("/auth/session")).json();
    expect(after.account_id).toBe(before.account_id);
    await expect(page.getByRole("button", { name: /Ganti email/ })).toContainText("oauth-test@example.invalid");
    const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
    expect(state.calls).not.toContain("/api/v1/auth/bootstrap");
    if (scenario === "mismatch") expect(state.calls).toContain("/auth/v1/user/identities/google-test");
    expect((await context.cookies()).filter(cookie => cookie.name === "cashly-google-link")).toHaveLength(0);
  });
}

test("password requirements and duplicate email keep invalid requests before OTP", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profil");
  await page.getByRole("button", { name: /Buat kata sandi Cashly/ }).click();
  await expect(page.locator(".password-length")).toHaveText("0/16");
  await expect(page.getByRole("list", { name: "Syarat kata sandi" }).getByRole("listitem")).toHaveCount(5);
  await page.getByLabel("Kata sandi baru", { exact: true }).fill("short");
  await page.getByLabel("Konfirmasi kata sandi", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Kirim kode verifikasi" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("8–16 karakter");
  await expect(page.getByLabel("Kode verifikasi akun")).toHaveCount(0);
  await page.getByLabel("Kata sandi baru", { exact: true }).fill("New-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi", { exact: true }).fill("New-Pass123!");
  await expect(page.locator('.password-requirements li[data-met="true"]')).toHaveCount(5);
  await page.getByRole("dialog").screenshot({ path: "test-results/account-password-requirements.png" });
  const state = await (await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls).not.toContain("/api/v1/me/security/password/request");
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await page.getByRole("button", { name: /Ganti email/ }).click();
  await page.getByLabel("Email baru", { exact: true }).fill("bad");
  await page.getByRole("button", { name: "Kirim kode verifikasi" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("valid dan berbeda");
  await page.getByLabel("Email baru", { exact: true }).fill("taken@example.invalid");
  await page.getByRole("button", { name: "Kirim kode verifikasi" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Email sudah terdaftar");
  await expect(page.getByLabel("Kode verifikasi akun")).toHaveCount(0);
  await expect(page.getByLabel("Email baru", { exact: true })).toHaveValue("taken@example.invalid");
});
