import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/link-mode?case=same");
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("oauth-test@example.invalid");
  await page.getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.goto("/profil");
  await page.getByRole("button", { name: /Ganti kata sandi/ }).click();
});

test("password change rejects missing/wrong old password without sending OTP", async ({ page, context, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("list",{name:"Syarat kata sandi"}).getByRole("listitem")).toHaveCount(5);
  await page.getByLabel("Kata sandi baru", { exact: true }).fill("Changed-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi", { exact: true }).fill("Changed-Pass123!");
  await page.getByRole("button", { name: "Simpan kata sandi", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Masukkan kata sandi saat ini");
  await page.getByLabel("Kata sandi saat ini", { exact: true }).fill("Wrong-Pass999!");
  await page.getByRole("button", { name: "Simpan kata sandi", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Kata sandi saat ini tidak sesuai");
  await expect(page.getByLabel("Kode verifikasi akun")).toHaveCount(0);
  await page.getByLabel("Kata sandi saat ini", { exact: true }).fill("Local-Test123!");
  await page.getByRole("dialog").screenshot({path:"test-results/current-password-dialog.png"});
  await page.getByRole("button", { name: "Simpan kata sandi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kata sandi berhasil diubah", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Ke halaman login", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await context.cookies()).filter(cookie=>cookie.name.startsWith("sb-") && cookie.value)).toHaveLength(0);
  const state=await(await request.get("http://127.0.0.1:34568/__test/state")).json();
  expect(state.calls).toContain("/api/v1/me/security/password/change");
});

test("forgot password from the dialog opens recovery", async ({ page }) => {
  await page.getByRole("dialog").getByRole("link", { name: "Lupa kata sandi?", exact: true }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("button", { name: "Kirim tautan reset", exact: true })).toBeVisible();
});
