import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ timezoneId: "Asia/Jakarta" });
const total = (page: Page) => page.locator(".activity-total-row > .money");
const rows = (page: Page) => page.locator(".transaction-row-timeline");
const dialog = (page: Page) => page.getByRole("dialog");
async function open(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-14T10:00:00+07:00"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/aktivitas");
  await expect(
    page.getByRole("heading", { name: "Aktivitas Keuangan" }),
  ).toBeVisible();
  await expect(total(page)).toHaveText("Rp1.248.500");
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 390, 1280]) {
    test(`Aktivitas responsive, tema, aksesibilitas ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          /hydrat|server rendered HTML/i.test(message.text())
        )
          errors.push(message.text());
      });
      await open(page);
      await expect(rows(page)).toHaveCount(6);
      await expect(page.locator(".activity-count")).toHaveText("6 transaksi");
      const nav = page.getByRole("navigation", {
        name: width < 1024 ? "Navigasi utama" : "Navigasi desktop",
      });
      await expect(
        nav.getByRole("link", { name: "Aktivitas" }),
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
        path: `test-results/activity-${width}-${theme}.png`,
        fullPage: true,
        caret: "initial",
      });
      await rows(page).first().click();
      await expect(dialog(page)).toHaveAccessibleName("Detail pengeluaran");
      await expect(dialog(page).locator(".detail-amount")).toHaveText(
        "−Rp28.000",
      );
      await dialog(page)
        .getByRole("button", { name: "Hapus", exact: true })
        .click();
      await expect(dialog(page)).toHaveAccessibleName("Hapus pengeluaran?");
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await dialog(page)
        .getByRole("button", { name: "Kembali", exact: true })
        .click();
      await expect(
        dialog(page).getByRole("button", { name: "Hapus", exact: true }),
      ).toBeFocused();
      await dialog(page).getByRole("button", { name: "Tutup dialog" }).click();
      await expect(rows(page).first()).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}

test("Pencarian, kategori dan filter gabungan dengan submodal periode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole("group", { name: "Kategori pengeluaran" })
    .getByRole("button", { name: "Makanan 2" })
    .click();
  await expect(total(page)).toHaveText("Rp580.000");
  await page.getByRole("searchbox").fill("#KopiSiang");
  await expect(rows(page)).toHaveCount(1);
  await expect(total(page)).toHaveText("Rp28.000");
  await page.getByRole("searchbox").fill("tidak ada");
  await expect(
    page.getByRole("heading", { name: "Belum ada hasil yang cocok" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filter", exact: true }).click();
  await page
    .getByRole("button", { name: "Filter aktivitas", exact: true })
    .click();
  await dialog(page).getByLabel("Sumber catatan").selectOption("voice");
  await dialog(page)
    .getByLabel("Pembayaran", { exact: true })
    .selectOption("Transfer bank");
  await dialog(page)
    .getByRole("button", { name: /Periode November 2026/ })
    .click();
  await expect(dialog(page)).toHaveAccessibleName("Pilih periode");
  await dialog(page)
    .getByRole("button", { name: "Kembali", exact: true })
    .click();
  await expect(dialog(page).getByLabel("Sumber catatan")).toHaveValue("voice");
  await dialog(page).getByRole("button", { name: "Terapkan filter" }).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(total(page)).toHaveText("Rp210.000");
  await expect(rows(page)).toContainText("Token listrik");
});

test("Harian, mingguan, rentang dan periode kosong dapat dipulihkan", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("tab", { name: "Harian" }).click();
  await expect(total(page)).toHaveText("Rp348.000");
  await page.getByRole("button", { name: "Hari berikutnya" }).click();
  await expect(total(page)).toHaveText("Rp0");
  await page.getByRole("button", { name: "Hari sebelumnya" }).click();
  await expect(rows(page)).toHaveCount(2);
  await page
    .getByRole("button", { name: "13 November 2026", exact: true })
    .click();
  await expect(dialog(page)).toHaveAccessibleName("Pilih hari");
  await dialog(page).locator('button[data-day="2026-11-12"]').click();
  await expect(total(page)).toHaveText("Rp210.000");
  await page.getByRole("tab", { name: "Mingguan" }).click();
  await expect(page.locator(".activity-group")).toHaveCount(3);
  await expect(page.locator(".activity-group-heading > .money")).toHaveText([
    "−Rp1.110.000",
    "−Rp100.000",
    "−Rp38.500",
  ]);
  await page.getByRole("button", { name: "Ubah periode aktivitas" }).click();
  await dialog(page)
    .getByRole("button", { name: "Rentang tanggal", exact: true })
    .click();
  await dialog(page).getByLabel("Tahun rentang").selectOption("2026");
  await dialog(page).getByLabel("Bulan rentang").selectOption("10");
  await dialog(page)
    .locator(
      ".react-datepicker__day--012:not(.react-datepicker__day--outside-month)",
    )
    .click();
  await dialog(page)
    .locator(
      ".react-datepicker__day--013:not(.react-datepicker__day--outside-month)",
    )
    .click();
  await dialog(page).getByRole("button", { name: "Terapkan periode" }).click();
  await expect(total(page)).toHaveText("Rp558.000");
  await page.getByRole("button", { name: "Ubah periode aktivitas" }).click();
  await dialog(page).getByLabel("Bulan rentang").selectOption("9");
  await dialog(page)
    .locator(
      ".react-datepicker__day--012:not(.react-datepicker__day--outside-month)",
    )
    .click();
  await dialog(page)
    .locator(
      ".react-datepicker__day--013:not(.react-datepicker__day--outside-month)",
    )
    .click();
  await dialog(page).getByRole("button", { name: "Terapkan periode" }).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada pengeluaran di periode ini" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ganti periode", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Kembali ke bulan ini" })
    .click();
  await expect(total(page)).toHaveText("Rp1.248.500");
});

test("Edit tervalidasi, total Beranda konsisten, hapus dan urungkan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await rows(page).first().click();
  await dialog(page).getByRole("button", { name: "Ubah detail" }).click();
  await expect(dialog(page)).toHaveAccessibleName("Ubah pengeluaran");
  await dialog(page).getByLabel("Harga satuan item 1").fill("0");
  await dialog(page).getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(dialog(page).getByRole("alert")).toBeVisible();
  await dialog(page).getByLabel("Harga satuan item 1").fill("35000");
  await dialog(page).getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(dialog(page)).toHaveAccessibleName("Detail pengeluaran");
  await expect(dialog(page).locator(".detail-amount")).toHaveText("−Rp35.000");
  await dialog(page).getByRole("button", { name: "Tutup dialog" }).click();
  await expect(total(page)).toHaveText("Rp1.255.500");
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Beranda" })
    .click();
  await expect(page.locator(".hero-amount")).toHaveText("Rp1.255.500");
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Aktivitas" })
    .click();
  await expect(total(page)).toHaveText("Rp1.255.500");
  await rows(page).first().click();
  await dialog(page)
    .getByRole("button", { name: "Hapus", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Batal", exact: true })
    .click();
  await expect(dialog(page)).toHaveAccessibleName("Detail pengeluaran");
  await dialog(page)
    .getByRole("button", { name: "Hapus", exact: true })
    .click();
  await dialog(page)
    .getByRole("button", { name: "Hapus pengeluaran", exact: true })
    .click();
  await expect(rows(page)).toHaveCount(5);
  await expect(total(page)).toHaveText("Rp1.220.500");
  await expect(page.getByRole("button", { name: "Urungkan" })).toBeFocused();
  await page.getByRole("button", { name: "Urungkan" }).click();
  await expect(rows(page)).toHaveCount(6);
  await expect(total(page)).toHaveText("Rp1.255.500");
  await page.reload();
  await expect(total(page)).toHaveText("Rp1.255.500");
});

test("Catat, profil, panduan instalasi dan status offline tetap tersedia", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole("button", { name: "Catat pengeluaran", exact: true })
    .last()
    .click();
  await dialog(page)
    .getByRole("button", { name: /Chat manual/ })
    .click();
  await expect(dialog(page)).toHaveClass(/expense-chat-flow/);
  await dialog(page)
    .getByRole("textbox", { name: "Catatan pengeluaran" })
    .fill("kopi 20k");
  await dialog(page).getByRole("button", { name: "Kirim catatan" }).click();
  await dialog(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Beranda" })
    .click();
  await page
    .locator(".expense-summary")
    .getByRole("button", { name: "Catat pengeluaran" })
    .click();
  await dialog(page)
    .getByRole("button", { name: /Chat manual/ })
    .click();
  await expect(dialog(page).getByRole("log")).toContainText("kopi 20k");
  await dialog(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Aktivitas" })
    .click();
  await expect(page.locator(".activity-header")).toBeVisible();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Profil", exact: true })
    .click();
  await page.getByRole("button", { name: "Install", exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName("Download Cashly");
  await dialog(page)
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await expect(dialog(page)).toHaveCount(0);
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Aktivitas", exact: true })
    .click();
  await context.setOffline(true);
  await expect(page.locator(".activity-main .local-data-status > span")).toHaveText("Offline");
  await expect(rows(page)).toHaveCount(6);
  await context.setOffline(false);
});

for (const source of ["scan", "chat"] as const) {
  test(`Capture ${source} dari Aktivitas kembali ke menu asal`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page
      .locator(".bottom-nav:visible")
      .getByRole("button", { name: "Catat pengeluaran", exact: true })
      .click();
    if (source === "scan") {
      await dialog(page)
        .getByRole("button", { name: /Scan struk otomatis/ })
        .click();
      await dialog(page)
        .getByRole("button", { name: "Coba struk contoh", exact: true })
        .click();
      await dialog(page)
        .getByRole("button", { name: /Simpan pengeluaran/ })
        .click();
    } else {
      await dialog(page)
        .getByRole("button", { name: /Chat manual/ })
        .click();
      await dialog(page)
        .getByRole("textbox", { name: "Catatan pengeluaran" })
        .fill("kopi 20k");
      await dialog(page).getByRole("button", { name: "Kirim catatan" }).click();
      await dialog(page)
        .getByRole("button", { name: /Tinjau 1 pengeluaran/ })
        .click();
      await dialog(page)
        .getByRole("button", { name: /Konfirmasi 1 pengeluaran/ })
        .click();
    }
    await dialog(page)
      .getByRole("button", { name: "Tutup dialog", exact: true })
      .click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/aktivitas$/);
    // Confirmations now join the same local demo ledger (ADR-0061).
    await expect(total(page)).toHaveText(source === "scan" ? "Rp1.296.000" : "Rp1.268.500");
    await expect(rows(page)).toHaveCount(7);
  });
}
