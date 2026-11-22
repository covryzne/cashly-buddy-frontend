import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ timezoneId: "America/Los_Angeles" });
for (const theme of ["light", "dark"] as const)
  for (const width of [320, 390, 1280]) {
    test(`Detail kategori Mochi, sheet, Back dan a11y ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (/hydrat|server rendered HTML/i.test(message.text()))
          errors.push(message.text());
      });
      await page.goto("/beranda");
      const trigger = page.getByRole("button", { name: /Makanan dan Minuman Rp580/ });
      await trigger.click();
      const modal = page.getByRole("dialog", { name: "Makanan dan Minuman", exact: true });
      await expect(modal).toHaveClass(/dialog-sheet/);
      await expect(modal.locator(".category-header-count")).toHaveText(
        "2 transaksi",
      );
      await expect(modal.locator(".category-detail-total > .money")).toHaveText(
        "Rp580.000",
      );
      await expect(
        modal.getByRole("progressbar", { name: "Porsi kategori" }),
      ).toHaveAttribute("aria-valuenow", "46.5");
      await expect(modal.locator(".category-detail-metrics")).toContainText(
        "Rp19.333",
      );
      await expect(modal.locator(".category-detail-metrics")).toContainText(
        "QRIS (100%)",
      );
      await expect(modal.locator(".category-comparison")).toHaveText(
        "Belum ada pembanding",
      );
      await expect(modal.locator(".transaction-row-category")).toHaveCount(2);
      await expect(
        modal.getByRole("button", { name: "Catat pengeluaran", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      expect(
        await modal.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await modal.screenshot({
        path: `node_modules/.cashly-qa/category-detail-${width}-${theme}.png`,
        caret: "initial",
      });
      await modal.getByRole("button", { name: /Kopi Sudut/ }).click();
      const detail = page.getByRole("dialog", {
        name: "Detail pengeluaran",
        exact: true,
      });
      await detail
        .getByRole("button", { name: "Kembali", exact: true })
        .click();
      await expect(
        modal.getByRole("button", { name: /Kopi Sudut/ }),
      ).toBeFocused();
      await modal
        .getByRole("button", { name: "Catat pengeluaran", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveAccessibleName(
        "Catat pengeluaran baru",
      );
      await page.getByRole("button", { name: "Kembali", exact: true }).click();
      await expect(
        modal.getByRole("button", { name: "Catat pengeluaran", exact: true }),
      ).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
test("Filter dan sort bertahan ketika detail dibuka dan Back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/aktivitas");
  await page.getByRole("button", { name: /Dapur Bersama/ }).click();
  let modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Ubah detail" }).click();
  await modal.getByLabel("Metode pembayaran (opsional)").selectOption("Tunai");
  await modal.getByRole("button", { name: "Simpan perubahan" }).click();
  await modal.getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Beranda", exact: true })
    .click();
  await page.getByRole("button", { name: /Makanan dan Minuman Rp580/ }).click();
  modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Tunai (1)", exact: true }).click();
  await expect(modal.locator(".transaction-row-category")).toHaveCount(1);
  await expect(modal.locator(".category-detail-total > .money")).toHaveText(
    "Rp580.000",
  );
  await modal.getByRole("button", { name: /Dapur Bersama/ }).click();
  await modal.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "Tunai (1)", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await modal.getByRole("button", { name: "Semua (2)", exact: true }).click();
  await modal
    .getByRole("button", { name: "Urutkan: terbaru dahulu", exact: true })
    .click();
  await expect(
    modal.locator(".transaction-row-category").first(),
  ).toContainText("Dapur Bersama");
  await modal.getByRole("button", { name: /Kopi Sudut/ }).click();
  await modal.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(
    modal.getByRole("button", { name: "Urutkan: terlama dahulu", exact: true }),
  ).toBeVisible();
});
test("Kategori tanpa data tetap menampilkan nol dan action pencatatan", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/beranda");
  await page
    .getByRole("button", { name: "Pilih periode pengeluaran", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rentang tanggal", exact: true })
    .click();
  await page.getByLabel("Tahun rentang").selectOption("2026");
  await page.getByLabel("Bulan rentang").selectOption("10");
  const day = page.locator(
    ".react-datepicker__day--014:not(.react-datepicker__day--outside-month)",
  );
  await day.click();
  await day.click();
  await page
    .getByRole("button", { name: "Terapkan periode", exact: true })
    .click();
  await page.getByRole("button", { name: /Makanan dan Minuman Rp0/ }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.locator(".category-detail-total > .money")).toHaveText(
    "Rp0",
  );
  await expect(modal.locator(".category-detail-empty")).toContainText(
    "Belum ada pengeluaran makanan dan minuman",
  );
  await expect(
    modal.getByRole("button", { name: "Catat pengeluaran", exact: true }),
  ).toBeEnabled();
});
