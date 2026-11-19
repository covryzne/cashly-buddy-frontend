import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const baseURL = process.env.CASHLY_DEV_URL ?? "http://localhost:3000";
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
    const issues = [];
    page.on("pageerror", (error) => issues.push(error.message));
    page.on("console", (message) => {
      if (
        /hydrat|server rendered HTML|either width or height modified/i.test(
          message.text(),
        )
      )
        issues.push(message.text());
    });
    await page.clock.setFixedTime(new Date("2026-11-14T10:00:00+07:00"));
    await page.goto(new URL("/aktivitas", baseURL).href);
    await expect(page.locator(".activity-total-row > .money")).toHaveText(
      "Rp1.248.500",
    );
    await expect(page.locator(".transaction-row-timeline")).toHaveCount(6);
    const styles = await page
      .locator(".activity-summary")
      .evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        radius: getComputedStyle(element).borderRadius,
        rowDisplay: getComputedStyle(
          document.querySelector(".transaction-row-timeline"),
        ).display,
        inputFont: getComputedStyle(
          document.querySelector(".activity-search input"),
        ).fontSize,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
    assert.equal(styles.radius, "24px");
    assert.equal(styles.rowDisplay, "grid");
    assert.equal(styles.inputFont, "16px");
    assert.equal(styles.overflow, false);
    await page.screenshot({
      path: `node_modules/.cashly-qa/activity-dev-${colorScheme}.png`,
      fullPage: true,
      caret: "initial",
    });
    await page
      .getByRole("button", { name: "Filter aktivitas", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "Filter aktivitas",
    );
    await page.screenshot({
      path: `node_modules/.cashly-qa/activity-filter-${colorScheme}.png`,
      caret: "initial",
    });
    await page.getByRole("button", { name: "Tutup dialog" }).click();
    assert.deepEqual(issues, []);
    console.log(
      `Activity dev ${colorScheme}: styles, totals, filter dialog, no overflow/hydration warnings passed`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
