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
  const accountSettings = page.getByRole("region", { name: "Akun", exact: true });
  await expect(accountSettings.getByText("Connected", { exact: true })).toBeVisible();
  await expect(accountSettings.getByText("Belum dibuat", { exact: true })).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    await page.setViewportSize({ width: 320, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await accountSettings.screenshot({ path: `test-results/account-google-${theme}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
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

test("Google user creates password through an email link and keeps the same account", async ({page,context})=>{
  await page.goto("/profil");
  await page.getByRole("button",{name:/Buat kata sandi Cashly/}).click();
  await expect(page.getByLabel("Kata sandi saat ini")).toHaveCount(0);
  await page.getByRole("button",{name:"Kirim tautan konfirmasi",exact:true}).click();
  await expect(page.getByRole("dialog")).toContainText("Tautan untuk membuat kata sandi dikirim");
  await page.goto(`/auth/password/callback?token_hash=${"a".repeat(64)}&email=oauth-test%40example.invalid`);
  await expect(page).toHaveURL(/\/reset-password$/);
  expect((await context.cookies()).find(c=>c.name==="cashly-password-link")?.httpOnly).toBeTruthy();
  await page.getByLabel("Kata sandi baru",{exact:true}).fill("New-Pass123!");
  await page.getByLabel("Konfirmasi kata sandi",{exact:true}).fill("New-Pass123!");
  expect((await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa"]).analyze()).violations).toEqual([]);
  await page.getByRole("button",{name:"Simpan kata sandi baru",exact:true}).click();
  await expect(page.getByRole("dialog",{name:"Kata sandi berhasil disimpan"})).toBeVisible();
  await page.getByRole("button",{name:"Ke halaman login"}).click();
  await page.locator(".login-form:visible").getByLabel("Email",{exact:true}).fill("oauth-test@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi",{exact:true}).fill("New-Pass123!");
  await page.getByRole("button",{name:"Masuk",exact:true}).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.goto("/profil");
  await expect(page.getByRole("button",{name:/Ganti kata sandi/})).toBeVisible();
  await expect(page.getByRole("region",{name:"Akun",exact:true}).getByText("Connected",{exact:true})).toBeVisible();
});

test("recovery confirms quota before check-in", async ({ page }) => {
  await page.getByRole("button", { name: "Pulihkan & check-in", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pulihkan streak?" });
  await expect(dialog).toContainText("Pakai 2 dari 5");
  await expect(dialog).toContainText("31 hari");
  await dialog.getByRole("button", { name: "Pulihkan & check-in", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("31 hari streak", { exact: false })).toBeVisible();
  await expect(page.getByText("3/5 proteksi bulan ini", { exact: false })).toBeVisible();
});
