import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const origin = process.env.CASHLY_DEV_URL ?? "http://localhost:3000";
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
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const errors = [];
    page.on("console", (message) => {
      if (
        /hydration|hydrated|server rendered HTML|either width or height/i.test(
          message.text(),
        )
      )
        errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(new URL("/login", origin).href);
    const trigger = page.getByRole("button", {
      name: "Download Cashly",
      exact: true,
    });
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: "Download Cashly", exact: true }),
    ).toContainText("Ketuk Bagikan");
    assert.equal(
      await page
        .locator(".install-steps")
        .evaluate((node) => getComputedStyle(node).display),
      "grid",
    );
    await page.screenshot({
      path: `node_modules/.cashly-qa/install-dev-${colorScheme}.png`,
    });
    await page.getByRole("button", { name: "Mengerti", exact: true }).click();
    await expect(trigger).toBeFocused();
    await page.goto(new URL("/beranda", origin).href);
    await page.getByRole("button", { name: "Profil", exact: true }).click();
    await page
      .getByRole("button", { name: "Download Cashly", exact: true })
      .click();
    await expect(page.locator("dialog[open]")).toHaveCount(1);
    await page.getByRole("button", { name: "Kembali", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Download Cashly", exact: true }),
    ).toBeFocused();
    assert.deepEqual(errors, []);
    console.log(
      `${colorScheme}: install guide dev OK — CSS, login/Profile, Back/focus and clean hydration`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
