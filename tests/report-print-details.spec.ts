import { test, expect } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });

for (const theme of ["light", "dark"] as const) {
  test(`PDF merinci seluruh kategori periode meskipun grafik dipilih ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
    await page.goto("/laporan");
    const details = page.locator(".report-print-details");
    await expect(details).toBeHidden();
    await page
      .getByRole("group", { name: "Periode laporan", exact: true })
      .getByRole("button", { name: "7 hari terakhir", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Pilih kategori laporan" })
      .getByRole("button", { name: /Transportasi/ })
      .click();
    await page.getByRole("button", { name: "Unduh", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "rincian transaksi per kategori",
    );
    await page.emulateMedia({ media: "print" });
    await expect(details).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(details.locator("table")).toHaveCount(3);
    await expect(
      details.locator("tbody tr:not(.report-print-subtotal)"),
    ).toHaveCount(4);
    const food = details
      .locator("table")
      .filter({ has: page.locator("caption", { hasText: "Makanan" }) });
    await expect(food.locator("tbody tr:first-child")).toContainText(
      "Kopi Sudut",
    );
    await expect(food.locator("tbody tr:first-child")).toContainText(
      "13 Nov 2026",
    );
    await expect(food.locator("tbody tr:first-child")).toContainText(
      "13.45 WIB",
    );
    await expect(food.locator("tbody tr:first-child")).toContainText("QRIS");
    await expect(food.locator(".report-print-subtotal .money")).toHaveText(
      "Rp580.000",
    );
    await expect(details).not.toContainText("Bioskop");
    await expect(details.locator(".report-print-total .money")).toHaveText(
      "Rp1.110.000",
    );
    expect(
      await details.evaluate((element) => ({
        foreground: getComputedStyle(element).color,
        overflow:
          document.body.style.overflow === "hidden" &&
          getComputedStyle(document.body).overflow !== "visible",
        wide: element.scrollWidth > element.clientWidth,
        repeat: getComputedStyle(element.querySelector("thead")!).display,
      })),
    ).toEqual({
      foreground: "rgb(36, 30, 54)",
      overflow: false,
      wide: false,
      repeat: "table-header-group",
    });
    await details.screenshot({
      path: `node_modules/.cashly-qa/report-print-details-${theme}.png`,
    });
    const pdf = await page.pdf({
      path: `test-results/report-category-details-${theme}.pdf`,
      format: "A4",
      margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
      printBackground: true,
    });
    expect(pdf.length).toBeGreaterThan(10000);
    expect(
      (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
    await page.emulateMedia({ media: "screen" });
    await expect(details).toBeHidden();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}

test("Cetak bulan kosong menjelaskan tidak ada transaksi dan tidak membuat tabel kosong", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
  await page.goto("/laporan");
  await page
    .getByRole("group", { name: "Periode laporan", exact: true })
    .getByRole("button", { name: "Oktober 2026", exact: true })
    .click();
  await page.emulateMedia({ media: "print" });
  const details = page.locator(".report-print-details");
  await expect(details).toContainText("Oktober 2026");
  await expect(details).toContainText("Belum ada transaksi pada periode ini.");
  await expect(details.locator("table")).toHaveCount(0);
  await expect(details.locator(".report-print-total .money")).toHaveText("Rp0");
});
