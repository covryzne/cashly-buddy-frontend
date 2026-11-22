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
    await page.goto(
      new URL("/profil", process.env.CASHLY_DEV_URL ?? "http://localhost:3000")
        .href,
    );
    await expect(page.locator(".profile-account-card h2")).toHaveText("Nara");
    await expect(
      page.locator(
        ".evolution-stage-card:not([inert]) .profile-mochi-stage img",
      ),
    ).toBeVisible();
    await expect(page.locator(".hero-level-badge")).toHaveText("Level 1");
    await expect(
      page.locator(".hero-carousel-toolbar .profile-account-kind"),
    ).toHaveText("340 XP terkumpul");
    assert.equal(
      await page
        .locator(".hero-carousel-art")
        .first()
        .evaluate((element) => getComputedStyle(element).position),
      "relative",
    );
    await expect(page.locator(".profile-mochi-speech")).toHaveCount(0);
    await expect(
      page.locator(".hero-carousel-navigation .icon-button"),
    ).toHaveCount(0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `node_modules/.cashly-qa/profile-dev-${colorScheme}.png`,
      fullPage: true,
      caret: "initial",
    });
    for (const level of [2, 3, 4, 5]) {
      await page
        .getByRole("button", { name: `Lihat hero level ${level}`, exact: true })
        .click();
      await expect(page.locator(".hero-level-badge")).toHaveText(
        `Level ${level}`,
      );
      const art = page.locator(
        ".evolution-stage-card:not([inert]) .hero-carousel-art",
      );
      await expect(art).toHaveClass(/is-locked/);
      await expect
        .poll(() =>
          art
            .locator("img")
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
      await page
        .locator(".profile-mochi-card")
        .screenshot({
          path: `node_modules/.cashly-qa/profile-stage-${level}-${colorScheme}.png`,
        });
    }
    await page
      .getByRole("button", { name: "Lihat hero level 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Ubah profil", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName("Ubah profil");
    assert.equal(
      await page
        .getByLabel(/Nama lengkap/)
        .evaluate((input) => getComputedStyle(input).fontSize),
      "16px",
    );
    await page.screenshot({
      path: `node_modules/.cashly-qa/profile-edit-dev-${colorScheme}.png`,
      caret: "initial",
    });
    await page.getByRole("button", { name: "Batal", exact: true }).click();
    assert.deepEqual(errors, []);
    console.log(
      `Profile dev ${colorScheme}: avatar, edit form, CSS, overflow and hydration passed`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
