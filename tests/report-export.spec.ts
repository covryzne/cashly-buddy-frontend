import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ timezoneId: "America/Los_Angeles" });

for (const theme of ["light", "dark"] as const)
  for (const width of [320, 390, 1280]) {
    test(`Digest ekspor, kategori nol, disclosure dan footer ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width === 390 ? 1000 : 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
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
      await page.goto("/laporan");
      await page
        .getByRole("group", { name: "Periode laporan" })
        .getByRole("button", { name: "7 hari terakhir", exact: true })
        .click();
      await page.getByRole("button", { name: "Unduh", exact: true }).click();
      const modal = page.getByRole("dialog", {
        name: "Ekspor ringkasan",
        exact: true,
      });
      await expect(
        modal.getByRole("heading", {
          name: "Cashly Weekly Digest",
          exact: true,
        }),
      ).toBeVisible();
      await expect(modal.locator(".report-export-stats .money")).toHaveText([
        "Rp1.110.000",
        "Rp158.571",
      ]);
      await expect(modal.locator(".report-export-stats")).toContainText(
        "4 transaksi",
      );
      await expect(modal.locator(".report-export-stats")).toContainText(
        "7 hari kalender",
      );
      await expect(modal.locator(".report-export-categories > li")).toHaveCount(
        4,
      );
      await expect(
        modal.locator(".report-export-category.is-empty"),
      ).toContainText("Hiburan");
      await expect(
        modal.locator(".report-export-category.is-empty .money"),
      ).toHaveText("Rp0");
      await expect(modal.locator(".report-export-tip")).toContainText(
        "Makanan (52.3%)",
      );
      await expect(
        modal.getByLabel("Teks ringkasan", { exact: true }),
      ).toBeHidden();
      await expect(
        modal.getByRole("button", { name: "Cetak / PDF", exact: true }),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        modal.getByRole("button", { name: "Salin ringkasan", exact: true }),
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
        path: `node_modules/.cashly-qa/export-digest-${width}-${theme}.png`,
        caret: "initial",
      });
      await modal.locator(".report-export-tip").scrollIntoViewIfNeeded();
      const tip = await modal.locator(".report-export-tip").boundingBox();
      const footer = await modal.locator(".dialog-footer").boundingBox();
      expect(tip!.y + tip!.height).toBeLessThanOrEqual(footer!.y + 1);
      const toggle = modal.getByRole("button", {
        name: "Lihat teks asli",
        exact: true,
      });
      await toggle.click();
      await expect(
        modal.getByLabel("Teks ringkasan", { exact: true }),
      ).toBeVisible();
      await expect(
        modal.getByLabel("Teks ringkasan", { exact: true }),
      ).toHaveValue(/Rp1.110.000 · 4 transaksi/);
      await modal
        .getByRole("button", { name: "Tutup teks asli", exact: true })
        .click();
      await expect(
        modal.getByLabel("Teks ringkasan", { exact: true }),
      ).toBeHidden();
      expect(errors).toEqual([]);
    });
  }

test("Digest bulanan dan kosong memakai data periode yang dipilih", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/laporan");
  await page.getByRole("button", { name: "Unduh", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("heading", { name: "Cashly Monthly Digest", exact: true }),
  ).toBeVisible();
  await expect(modal.locator(".report-export-stats .money")).toHaveText([
    "Rp1.248.500",
    "Rp41.617",
  ]);
  await expect(modal.locator(".report-export-stats")).toContainText(
    "30 hari kalender",
  );
  await modal
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Periode laporan" })
    .getByRole("button", { name: "Oktober 2026", exact: true })
    .click();
  await page.getByRole("button", { name: "Unduh", exact: true }).click();
  await expect(modal.locator(".report-export-stats .money")).toHaveText([
    "Rp0",
    "Rp0",
  ]);
  await expect(modal.locator(".report-export-category.is-empty")).toHaveCount(
    4,
  );
  await expect(modal.locator(".report-export-tip")).toContainText(
    "Belum ada pengeluaran",
  );
});
