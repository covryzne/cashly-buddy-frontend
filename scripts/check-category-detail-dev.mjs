import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
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
      new URL("/beranda", process.env.CASHLY_DEV_URL ?? "http://localhost:3000")
        .href,
    );
    await page.getByRole("button", { name: /Makanan Rp580/ }).click();
    const dialog = page.getByRole("dialog", { name: "Makanan", exact: true });
    await expect(dialog.locator(".category-detail-total > .money")).toHaveText(
      "Rp580.000",
    );
    assert.equal(
      await dialog.evaluate((element) => getComputedStyle(element).display),
      "flex",
    );
    assert.equal(
      await dialog
        .locator(".transaction-row-category")
        .first()
        .evaluate((element) => getComputedStyle(element).display),
      "grid",
    );
    await expect(dialog.locator(".category-detail-summary")).toHaveCSS(
      "background-image",
      "none",
    );
    await expect(
      dialog.getByRole("button", { name: "Catat pengeluaran", exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await dialog.screenshot({
      path: `node_modules/.cashly-qa/category-dev-${colorScheme}.png`,
      caret: "initial",
    });
    await dialog.getByRole("button", { name: /Kopi Sudut/ }).click();
    await page.getByRole("button", { name: "Kembali", exact: true }).click();
    await expect(
      dialog.getByRole("button", { name: /Kopi Sudut/ }),
    ).toBeFocused();
    assert.deepEqual(errors, []);
    console.log(
      `Category detail dev ${colorScheme}: totals, styles, footer, Back/focus and hydration passed`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
