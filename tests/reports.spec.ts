import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ timezoneId: "America/Los_Angeles" });
const modal = (page: Page) => page.getByRole("dialog");
const total = (page: Page) => page.locator(".report-total");
async function open(page: Page) {
  await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/laporan");
  await expect(total(page)).toHaveText("Rp1.248.500");
}
for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 390, 1280]) {
    test(`Laporan responsive, donut keyboard, Back dan a11y ${width} ${theme}`, async ({
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
      await expect(
        page.getByRole("heading", { name: "Laporan Pengeluaran" }),
      ).toBeVisible();
      const nav = page.getByRole("navigation", {
        name: width < 1024 ? "Navigasi utama" : "Navigasi desktop",
      });
      await expect(
        nav.getByRole("link", { name: "Laporan", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(page.locator(".report-summary-top .pill")).toHaveText(
        "6 transaksi",
      );
      await expect(page.locator(".report-summary-stats")).toContainText(
        "Rp41.617",
      );
      await expect(page.locator(".report-donut-center strong")).toHaveText(
        "6 transaksi",
      );
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
        path: `test-results/reports-${width}-${theme}.png`,
        fullPage: true,
        caret: "initial",
      });
      const arc = page.getByRole("button", {
        name: "Transportasi, 25.6 persen, 1 transaksi",
        exact: true,
      });
      await arc.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".report-donut-center span")).toHaveText(
        "Transportasi",
      );
      await page
        .getByRole("button", { name: /Lihat 1 transaksi transportasi/ })
        .click();
      await expect(modal(page)).toHaveAccessibleName("Rincian kategori");
      await modal(page)
        .getByRole("button", { name: /MRT Jakarta/ })
        .click();
      await expect(modal(page)).toHaveAccessibleName("Detail pengeluaran");
      await expect(modal(page).locator(".detail-amount")).toHaveText(
        "−Rp320.000",
      );
      await modal(page)
        .getByRole("button", { name: "Kembali", exact: true })
        .click();
      await expect(
        modal(page).getByRole("button", { name: /MRT Jakarta/ }),
      ).toBeFocused();
      await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
      expect(errors).toEqual([]);
    });
  }
}
for (const theme of ["light", "dark"] as const) {
  test(`Donut toggle, pembesaran ease dan semua transaksi ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme });
    await open(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const center = page.locator(".report-donut-center");
    const arc = page.getByRole("button", {
      name: "Makanan, 46.5 persen, 2 transaksi",
      exact: true,
    });
    await expect(center).toContainText("Semua kategori");
    const initial = await arc.boundingBox();
    await arc.click({
      position: { x: initial!.width * 0.98, y: initial!.height * 0.45 },
    });
    await expect(arc).toHaveAttribute("aria-pressed", "true");
    await expect(center).toContainText("46.5%");
    await expect
      .poll(async () => (await arc.boundingBox())!.width)
      .toBeGreaterThan(initial!.width + 2);
    const enlarged = await arc.boundingBox();
    await arc.click({
      position: { x: enlarged!.width * 0.98, y: enlarged!.height * 0.45 },
    });
    await expect(arc).toHaveAttribute("aria-pressed", "false");
    await expect(center).toContainText("6 transaksi");
    await page
      .getByRole("button", { name: "Lihat semua 6 transaksi", exact: true })
      .click();
    await expect(modal(page)).toHaveAccessibleName("Semua transaksi");
    await expect(modal(page).locator(".transaction-row")).toHaveCount(6);
    await modal(page)
      .getByRole("button", { name: /Kopi Sudut/ })
      .click();
    await expect(modal(page)).toHaveAccessibleName("Detail pengeluaran");
    await modal(page)
      .getByRole("button", { name: "Kembali", exact: true })
      .click();
    await expect(modal(page)).toHaveAccessibleName("Semua transaksi");
    await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
    const legend = page.getByRole("group", { name: "Pilih kategori laporan" });
    const food = legend.getByRole("button", { name: /Makanan/ });
    await food.click();
    await expect(arc).toHaveAttribute("aria-pressed", "true");
    await food.click();
    await expect(arc).toHaveAttribute("aria-pressed", "false");
    await arc.focus();
    await page.keyboard.press("Space");
    await expect(arc).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(arc).toHaveAttribute("aria-pressed", "false");
    await food.click();
    await legend
      .getByRole("button", { name: "Semua kategori", exact: true })
      .click();
    await expect(center).toContainText("6 transaksi");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(arc).toHaveCSS("transition-duration", "0s");
  });
}

test("Preset, rentang tanggal, tren dan empty state sesuai transaksi", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole("group", { name: "Periode laporan" })
    .getByRole("button", { name: "7 hari terakhir", exact: true })
    .click();
  await expect(total(page)).toHaveText("Rp1.110.000");
  await expect(page.locator(".report-trend-point")).toHaveCount(7);
  await expect(page.locator(".report-summary-stats")).toContainText(
    "Naik 1010%",
  );
  await page
    .getByRole("button", { name: "Pilih periode laporan", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: "Rentang tanggal", exact: true })
    .click();
  await modal(page).getByLabel("Tahun rentang").selectOption("2026");
  await modal(page).getByLabel("Bulan rentang").selectOption("10");
  await modal(page)
    .locator(
      ".react-datepicker__day--012:not(.react-datepicker__day--outside-month)",
    )
    .click();
  await modal(page)
    .locator(
      ".react-datepicker__day--013:not(.react-datepicker__day--outside-month)",
    )
    .click();
  await modal(page).getByRole("button", { name: "Terapkan periode" }).click();
  await expect(total(page)).toHaveText("Rp558.000");
  await page
    .getByRole("button", { name: "Lihat semua 3 transaksi", exact: true })
    .click();
  await expect(modal(page).locator(".transaction-row")).toHaveCount(3);
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .getByRole("group", { name: "Pilih interval tren" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".report-trend-detail")).toContainText("Rp210.000");
  await page
    .getByRole("button", { name: "Lihat 1 transaksi periode ini", exact: true })
    .click();
  await expect(modal(page)).toHaveAccessibleName("Rincian tren");
  await expect(modal(page)).toContainText("Token listrik");
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .getByRole("group", { name: "Periode laporan" })
    .getByRole("button", { name: "Oktober 2026", exact: true })
    .click();
  await expect(total(page)).toHaveText("Rp0");
  await expect(
    page.getByRole("region", { name: "Laporan kosong" }),
  ).toBeVisible();
  await expect(page.locator(".report-donut-center strong")).toHaveText(
    "0 transaksi",
  );
  await expect(
    page.getByRole("button", { name: "Buka Money Story lengkap" }),
  ).toBeDisabled();
  await page
    .getByRole("group", { name: "Periode laporan" })
    .getByRole("button", { name: "Bulan ini", exact: true })
    .click();
  await expect(total(page)).toHaveText("Rp1.248.500");
});
test("Review eksplisit, perubahan Aktivitas memperbarui Laporan dan menandai review baru", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.locator(".report-reviewed")).toHaveCount(0);
  await page.getByRole("button", { name: "Buka Money Story lengkap" }).click();
  await expect(modal(page)).toContainText("Rp1.110.000");
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await expect(page.locator(".report-reviewed")).toHaveCount(0);
  await page.getByRole("button", { name: "Buka Money Story lengkap" }).click();
  await modal(page)
    .getByRole("button", { name: "Selesai review", exact: true })
    .click();
  await expect(page.locator(".report-reviewed")).toBeVisible();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Aktivitas", exact: true })
    .click();
  await page.locator(".transaction-row-timeline").first().click();
  await modal(page).getByRole("button", { name: "Ubah detail" }).click();
  await modal(page).getByLabel("Harga satuan item 1").fill("35000");
  await modal(page).getByRole("button", { name: "Simpan perubahan" }).click();
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Laporan", exact: true })
    .click();
  await expect(total(page)).toHaveText("Rp1.255.500");
  await expect(page.locator(".report-reviewed")).toHaveCount(0);
});
test("Ekspor menyalin data periode dan menyediakan print layout untuk PDF", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value: string) =>
          (document.documentElement.dataset.copied = value),
      },
      configurable: true,
    });
    window.print = () => {
      document.documentElement.dataset.printed = "yes";
    };
  });
  await open(page);
  await page.getByRole("button", { name: "Unduh", exact: true }).click();
  await expect(modal(page)).toHaveAccessibleName("Ekspor ringkasan");
  await expect(modal(page).getByLabel("Teks ringkasan")).toBeHidden();
  await modal(page)
    .getByRole("button", { name: "Lihat teks asli", exact: true })
    .click();
  await expect(modal(page).getByLabel("Teks ringkasan")).toHaveValue(
    /Rp1.248.500 · 6 transaksi/,
  );
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await modal(page).getByRole("button", { name: "Salin ringkasan" }).click();
  await expect(modal(page).getByRole("status")).toHaveText(
    "Ringkasan berhasil disalin.",
  );
  expect(await page.locator("html").getAttribute("data-copied")).toContain(
    "November 2026",
  );
  await modal(page).getByRole("button", { name: "Cetak / PDF" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-printed", "yes");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".bottom-nav")).toBeHidden();
  await expect(modal(page)).toBeHidden();
  await expect(total(page)).toBeVisible();
  await page.pdf({
    path: "test-results/reports-summary.pdf",
    printBackground: true,
    format: "A4",
  });
  // Print rules must not blank other routes after a report has been opened.
  await page.emulateMedia({ media: "screen" });
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Beranda", exact: true })
    .click();
  await expect(page.locator(".hero-amount")).toHaveText("Rp1.248.500");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".hero-amount")).toBeVisible();
  await expect(total(page)).toBeHidden();
});
test("Clipboard ditolak memberi fallback, quick add/profil/install dapat dibuka", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    }),
  );
  await open(page);
  await page
    .getByRole("button", { name: "Bagikan ringkasan laporan", exact: true })
    .click();
  await modal(page).getByRole("button", { name: "Salin ringkasan" }).click();
  await expect(modal(page).getByRole("status")).toContainText("secara manual");
  await expect(modal(page).getByLabel("Teks ringkasan")).toBeFocused();
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("button", { name: "Catat pengeluaran", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: /Chat manual/ })
    .click();
  await expect(modal(page)).toHaveClass(/expense-chat-flow/);
  await modal(page)
    .getByRole("button", { name: "Kembali", exact: true })
    .click();
  await expect(modal(page)).toHaveAccessibleName("Catat pengeluaran baru");
  await modal(page).getByRole("button", { name: "Tutup dialog" }).click();
  await page
    .locator(".bottom-nav:visible")
    .getByRole("link", { name: "Profil", exact: true })
    .click();
  await page.getByRole("button", { name: "Install", exact: true }).click();
  await expect(modal(page)).toHaveAccessibleName("Download Cashly");
  await modal(page)
    .getByRole("button", { name: "Mengerti", exact: true })
    .click();
  await expect(modal(page)).toHaveCount(0);
});
