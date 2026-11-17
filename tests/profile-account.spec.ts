import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page, request }) => {
  await request.get("http://127.0.0.1:34568/__test/profile-mode");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByRole("button", { name: "Lanjutkan dengan Google" }).click();
  await expect(page).toHaveURL(/\/beranda/);
});

test("profile persists editable fields, email is read-only and duplicate username is recoverable", async ({ page }) => {
  await page.goto("/profil");
  await expect(page.getByRole("button", { name: /Buat kata sandi Cashly/ })).toBeVisible();
  await page.getByRole("button", { name: "Ubah profil" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("oauth-test@example.invalid");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.getByLabel("Nama lengkap").fill("Nama Tersimpan");
  await page.getByLabel("Username", { exact: true }).fill("taken.name");
  await page.getByRole("button", { name: "Simpan profil" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Username sudah digunakan");
  await page.getByLabel("Username", { exact: true }).fill("New.Name");
  await page.getByRole("button", { name: "Simpan profil" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Ubah profil" }).click();
  await expect(page.getByLabel("Nama lengkap")).toHaveValue("Nama Tersimpan");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue("new.name");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: "test-results/profile-persisted-mobile.png", fullPage: true });
});

test("Google user optionally creates password with OTP then signs in to the same account", async ({ page }) => {
  await page.goto("/profil");
  await page.getByRole("button", { name: /Buat kata sandi Cashly/ }).click();
  await page.getByLabel("Kata sandi baru", { exact: true }).fill("New-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi", { exact: true }).fill("New-Pass123!");
  await page.getByRole("button", { name: "Kirim kode verifikasi", exact: true }).click();
  await expect(page.getByRole("button", { name: /Kirim ulang dalam/ })).toBeDisabled();
  await expect(page.locator(".otp-digit")).toHaveCount(6);
  await page.getByLabel("Kode verifikasi akun").fill("000000");
  await page.getByRole("button", { name: "Simpan kata sandi", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Kode tidak valid");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { readText: async () => "1 2 3\n4 5 6" } }));
  await page.getByRole("button", { name: "Tempel OTP" }).click();
  await expect(page.getByLabel("Kode verifikasi akun")).toHaveValue("123456");
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations;
  expect(violations).toEqual([]);
  await page.screenshot({ path: "test-results/account-otp-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Simpan kata sandi", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kata sandi berhasil dibuat" })).toBeVisible();
  await page.getByRole("button", { name: "Ke halaman login" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email", { exact: true }).fill("oauth-test@example.invalid");
  await page.getByLabel("Kata sandi", { exact: true }).fill("New-Pass123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.goto("/profil");
  await expect(page.getByRole("button", { name: /Ganti kata sandi/ })).toBeVisible();
});

test("email requires both OTPs and recovery confirms quota before check-in", async ({ page }) => {
  await page.getByRole("button", { name: "Pulihkan & check-in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pulihkan streak?" });
  await expect(dialog).toContainText("Pakai 2 dari 5");
  await expect(dialog).toContainText("31 hari");
  await dialog.getByRole("button", { name: "Pulihkan & check-in", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("31 hari streak", { exact: false })).toBeVisible();
  await expect(page.getByText("3/5 proteksi bulan ini", { exact: false })).toBeVisible();
  await page.goto("/profil");
  await page.getByRole("button", { name: /Ganti email/ }).click();
  await page.getByLabel("Email baru", { exact: true }).fill("updated@example.invalid");
  await page.getByRole("button", { name: "Kirim kode verifikasi", exact: true }).click();
  await page.getByLabel("Kode verifikasi akun").fill("111111");
  await page.getByRole("button", { name: "Verifikasi email lama", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Email lama sudah dikonfirmasi");
  await expect(page.getByRole("dialog")).toContainText("updated@example.invalid");
  await page.getByLabel("Kode verifikasi akun").fill("222222");
  await page.getByRole("button", { name: "Verifikasi email baru", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Email berhasil diubah" })).toBeVisible();
  await page.getByRole("button", { name: "Ke halaman login" }).click();
  await expect(page).toHaveURL(/\/login/);
});

