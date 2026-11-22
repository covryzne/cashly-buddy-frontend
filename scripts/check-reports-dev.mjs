import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
await mkdir("node_modules/.cashly-qa", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader"],
});
try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({
      colorScheme,
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (
        /hydrat|server rendered HTML|either width or height modified/i.test(
          message.text(),
        )
      )
        errors.push(message.text());
    });
    await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
    await page.goto(
      new URL("/laporan", process.env.CASHLY_DEV_URL ?? "http://localhost:3000")
        .href,
    );
    await expect(page.locator(".report-total")).toHaveText("Rp1.248.500");
    await page
      .getByRole("group", { name: "Pilih kategori laporan" })
      .getByRole("button", { name: /Transportasi/ })
      .click();
    await expect(page.locator(".report-donut-center span")).toHaveText(
      "Transportasi",
    );
    const styles = await page.locator(".report-donut").evaluate((svg) => ({
      width: svg.getBoundingClientRect().width,
      grid: getComputedStyle(document.querySelector(".report-grid")).display,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    assert.equal(styles.grid, "grid");
    assert.equal(styles.overflow, false);
    assert.ok(styles.width <= 260);
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.screenshot({
      path: `node_modules/.cashly-qa/reports-dev-${colorScheme}.png`,
      fullPage: true,
      caret: "initial",
    });
    await page
      .getByRole("button", { name: "Pilih periode laporan", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "Pilih periode laporan",
    );
    await page.getByRole("button", { name: "Tutup dialog" }).click();
    await page.getByRole("button", { name: "Unduh", exact: true }).click();
    const exportDialog = page.getByRole("dialog", {
      name: "Ekspor ringkasan",
      exact: true,
    });
    await expect(
      exportDialog.getByRole("heading", {
        name: "Cashly Monthly Digest",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      exportDialog.getByLabel("Teks ringkasan", { exact: true }),
    ).toBeHidden();
    assert.equal(
      await exportDialog.evaluate(
        (element) => getComputedStyle(element).display,
      ),
      "flex",
    );
    await exportDialog.locator(".report-export-tip").scrollIntoViewIfNeeded();
    await expect(
      exportDialog.getByRole("button", { name: "Cetak / PDF", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await exportDialog.screenshot({
      path: `node_modules/.cashly-qa/export-dev-${colorScheme}.png`,
      caret: "initial",
    });
    await exportDialog
      .getByRole("button", { name: "Tutup dialog", exact: true })
      .click();
    assert.deepEqual(errors, []);
    console.log(
      `Reports dev ${colorScheme}: totals, chart selection, styles, overflow and hydration checks passed`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
