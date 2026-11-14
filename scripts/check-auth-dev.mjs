import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const baseURL = process.env.CASHLY_DEV_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const colorScheme of ["light", "dark"]) {
    const page = await browser.newPage({
      colorScheme,
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
    });
    const hydrationErrors = [];
    const imageWarnings = [];
    page.on("console", (message) => {
      if (
        /google-g\.png/.test(message.text()) &&
        /width|height/.test(message.text())
      )
        imageWarnings.push(message.text());
      if (
        message.type() === "error" &&
        /hydrat|server rendered|server-rendered/i.test(message.text())
      )
        hydrationErrors.push(message.text());
    });
    page.on("pageerror", (error) => hydrationErrors.push(error.message));
    const response = await page.goto(new URL("/login", baseURL).href);
    assert.equal(response?.status(), 200);
    assert.equal(
      (await response.text()).includes("bis_skin_checked"),
      false,
      "Server must not emit extension attributes",
    );
    await page
      .getByRole("heading", { name: "Selamat datang kembali!" })
      .waitFor();
    async function checkGoogleImage() {
      const image = page.locator(".google-sign-in img");
      await expect(image).toBeVisible();
      const size = await image.evaluate(async (node) => {
        await node.decode();
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          autoHeight: node.style.height,
        };
      });
      assert.equal(size.width, 20);
      assert.equal(size.autoHeight, "auto");
      assert.ok(
        // Small optimized rasters round their dimensions; naturalWidth is also
        // density-corrected and rounded. Allow subpixel rounding from 200×204.
        Math.abs(size.height - (size.width * 204) / 200) < 0.5,
        "Google icon must keep its actual aspect ratio",
      );
    }
    await checkGoogleImage();
    assert.equal(await page.locator("[bis_skin_checked]").count(), 0);
    await page
      .getByRole("button", { name: "Isi data contoh", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Tampilkan kata sandi", exact: true })
      .click();
    await expect(
      page.getByLabel("Kata sandi", { exact: true }),
    ).toHaveAttribute("type", "text");
    await page
      .getByRole("button", { name: "Masuk ke demo", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Hi, Nara!" }),
    ).toBeVisible();
    await page.goto(new URL("/register", baseURL).href);
    await checkGoogleImage();
    assert.deepEqual(
      imageWarnings,
      [],
      "Google image must load without dimension warnings on login/register",
    );
    assert.deepEqual(
      hydrationErrors,
      [],
      "Clean Chrome must hydrate auth and navigation without warnings",
    );
    console.log(
      `${colorScheme}: dev auth OK — hydration, login flow and proportional Google icon on login/register`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
