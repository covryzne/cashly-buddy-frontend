import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const dialog = (page: Page) => page.getByRole("dialog");
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/profil");
  await expect(
    page.getByRole("heading", { name: "Profil Akun", exact: true }),
  ).toBeVisible();
}
for (const theme of ["light", "dark"] as const)
  for (const width of [320, 390, 1280]) {
    test(`Profil responsive, evolusi, form dan a11y ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          /hydrat|server rendered HTML|either width or height modified/i.test(
            message.text(),
          )
        )
          errors.push(message.text());
      });
      await open(page);
      await expect(page.locator(".profile-account-card h2")).toHaveText("Nara");
      await expect(
        page.locator(
          ".evolution-stage-card:not([inert]) .profile-mochi-stage img",
        ),
      ).toBeVisible();
      const nav = page.getByRole("navigation", {
        name: width < 1024 ? "Navigasi utama" : "Navigasi desktop",
      });
      await expect(
        nav.getByRole("link", { name: "Profil", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/profile-${width}-${theme}.png`,
        fullPage: true,
        caret: "initial",
      });
      await page
        .getByRole("button", { name: "Ubah profil", exact: true })
        .click();
      await expect(dialog(page)).toHaveAccessibleName("Ubah profil");
      await expect(
        dialog(page).getByRole("button", {
          name: "Simpan profil",
          exact: true,
        }),
      ).toBeInViewport({ ratio: 1 });
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await dialog(page)
        .getByRole("button", { name: "Batal", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Ubah profil", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Lihat hero level 4", exact: true })
        .click();
      const infoHero = page.getByRole("button", {
        name: "Info hero level 4",
        exact: true,
      });
      await infoHero.click();
      await expect(dialog(page)).toHaveAccessibleName("Mochi level 4");
      await expect(dialog(page).getByRole("button", { name: "Mengerti", exact: true })).toHaveCount(0);
      await expect(dialog(page).locator(".dialog-footer")).toHaveCount(0);
      await expect(
        dialog(page).locator(".evolution-guide-list li"),
      ).toHaveClass(/is-highlighted/);
      await expect(dialog(page)).toContainText("150 hari streak");
      await expect(
        dialog(page).getByRole("button", {
          name: "Streak & Freeze",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        dialog(page).locator(".evolution-guide-list li"),
      ).toHaveCount(1);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await dialog(page)
        .getByRole("button", { name: "Tutup dialog", exact: true })
        .click();
      await expect(infoHero).toBeFocused();
      await page
        .getByRole("button", { name: "Panduan Mochi", exact: true })
        .click();
      await expect(dialog(page)).toHaveAccessibleName("Evolusi Mochi & Freeze");
      await expect(
        dialog(page).locator(".evolution-guide-list li"),
      ).toHaveCount(5);
      await dialog(page)
        .getByRole("button", { name: "Streak & Freeze", exact: true })
        .click();
      await expect(dialog(page)).toContainText("tidak terpakai otomatis");
      await dialog(page)
        .getByRole("button", { name: "Tutup dialog", exact: true })
        .click();
      expect(errors).toEqual([]);
    });
  }
test("Edit profil cancel-safe, validasi, sinkron Beranda dan reset setelah refresh", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await open(page);
  await page.getByRole("button", { name: "Ubah profil", exact: true }).click();
  await dialog(page)
    .getByLabel(/Nama lengkap/)
    .fill("Dibatalkan");
  await dialog(page)
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(page.locator(".profile-account-card h2")).toHaveText("Nara");
  await page.getByRole("button", { name: "Ubah profil", exact: true }).click();
  await dialog(page)
    .getByLabel(/Nama lengkap/)
    .fill("");
  await dialog(page)
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(dialog(page).getByLabel(/Nama lengkap/)).toBeFocused();
  await expect(dialog(page)).toContainText("Isi nama lengkapmu.");
  const name = "N".repeat(50);
  await dialog(page)
    .getByLabel(/Nama lengkap/)
    .fill(name);
  await dialog(page).getByLabel("Username", { exact: true }).fill("NARA.BARU");
  await dialog(page)
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(page.locator(".profile-account-card h2")).toHaveText(name);
  await expect(page.locator(".profile-account-card")).toContainText(
    "@nara.baru",
  );
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Beranda", exact: true })
    .click();
  await expect(page.locator(".greeting-row h1")).toContainText(name);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.locator(".greeting-row h1")).toContainText("Nara");
});
test("Foto galeri divalidasi, gambar rusak pulih, avatar tersimpan hanya pada sesi", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Ubah profil", exact: true }).click();
  const upload = dialog(page).getByLabel("Pilih foto profil", { exact: true });
  await upload.setInputFiles({
    name: "bad.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(dialog(page).getByRole("alert")).toContainText("JPG");
  await upload.setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("broken png"),
  });
  await expect(dialog(page).getByRole("alert")).toContainText(
    "tidak dapat dibaca",
  );
  await upload.setInputFiles({
    name: "big.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(dialog(page).getByRole("alert")).toContainText("2 MB");
  await upload.setInputFiles("public/branding/google-g.png");
  await expect(dialog(page).locator(".profile-avatar")).toHaveClass(
    /avatar-photo/,
  );
  await dialog(page)
    .getByLabel(/Nama lengkap/)
    .fill("Foto Nara");
  await dialog(page)
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(
    page.locator(".profile-account-card .profile-avatar"),
  ).toHaveClass(/avatar-photo/);
  await expect(page.locator(".profile-account-card img")).toHaveAttribute(
    "src",
    /^data:image\/png;base64,/,
  );
  await page.getByRole("button", { name: "Ubah profil", exact: true }).click();
  await dialog(page)
    .getByRole("button", { name: "Hapus", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await expect(
    page.locator(".profile-account-card .profile-avatar"),
  ).toHaveClass(/avatar-initials/);
});
test("Tema sinkron dengan header, persistensi dan submodal kembali dengan fokus", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Tampilan aplikasi/ }).click();
  await dialog(page).getByRole("radio", { name: "Gelap", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await dialog(page)
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tema gelap. Ganti tema", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /XP & Level 340/ }).click();
  await dialog(page)
    .getByRole("button", { name: /Lihat tahapan evolusi/ })
    .click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await dialog(page)
    .getByRole("button", { name: "Kembali", exact: true })
    .click();
  await expect(dialog(page)).toHaveAccessibleName("XP & level");
  await expect(
    dialog(page).getByRole("button", { name: /Lihat tahapan evolusi/ }),
  ).toBeFocused();
});
test("WhatsApp/pengingat belum aktif, instalasi dan quick add memakai flow bersama", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(dialog(page)).toHaveAccessibleName("Hubungkan WhatsApp");
  await expect(dialog(page)).toContainText(
    "OTP contoh belum mendaftarkan nomor WhatsApp",
  );
  await dialog(page)
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await page.getByRole("button", { name: /Pengingat catat harian/ }).click();
  await expect(dialog(page)).toContainText("Pengingat otomatis belum tersedia");
  await dialog(page)
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await page.getByRole("button", { name: "Install", exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName("Download Cashly");
  await dialog(page)
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".bottom-nav:visible")
    .getByRole("button", { name: "Catat pengeluaran", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: /Chat manual/ })
    .click();
  await expect(dialog(page)).toHaveClass(/expense-chat-flow/);
  await dialog(page)
    .getByRole("button", { name: "Kembali", exact: true })
    .click();
  await expect(dialog(page)).toHaveAccessibleName("Catat pengeluaran baru");
});
test("Keluar butuh konfirmasi dan mereset state sementara", async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.addEventListener("pagehide", () => {
      sessionStorage.setItem(
        "qa-profile-before-leave",
        document.querySelector(".profile-account-card h2")?.textContent ?? "",
      );
    }),
  );
  await open(page);
  await page.getByRole("button", { name: "Ubah profil", exact: true }).click();
  await dialog(page)
    .getByLabel(/Nama lengkap/)
    .fill("Nama Sementara");
  await dialog(page)
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Keluar dari akun/ })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Tetap di sini", exact: true })
    .click();
  await expect(page).toHaveURL(/\/profil$/);
  await page
    .getByRole("button", { name: /^Keluar dari akun/ })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Keluar", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("qa-profile-before-leave"),
    ),
  ).toBe("");
  await page.goto("/profil");
  await expect(page.locator(".profile-account-card h2")).toHaveText("Nara");
});
