import { test, expect, type Locator } from "@playwright/test";

async function expectUsableBody(modal: Locator, viewportHeight: number) {
  const body = modal.locator(":scope > .dialog-content");
  // Bounds alone pass even when WebKit collapses the body to its padding.
  await expect
    .poll(() => body.evaluate((element) => element.clientHeight))
    .toBeGreaterThan(Math.min(260, viewportHeight * 0.4));
  const box = (await modal.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight + 1);
  return body;
}

for (const theme of ["light", "dark"] as const) {
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1280, height: 900 },
  ]) {
    test(`WhatsApp body does not collapse ${size.width}x${size.height} ${theme}`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport: size,
        isMobile: size.width < 1000,
        hasTouch: true,
        colorScheme: theme,
        reducedMotion: "no-preference",
      });
      const page = await context.newPage();
      try {
        await page.goto("/profil");
        const trigger = page.getByRole("button", {
          name: /Catat via WhatsApp/,
        });
        // Establish a keyboard focus origin: WebKit pointer clicks do not focus
        // buttons by default, so restoration otherwise starts at the document.
        await trigger.focus();
        await trigger.press("Enter");
        const modal = page.getByRole("dialog");
        await expect(modal).toHaveAccessibleName("Hubungkan WhatsApp");
        // Wait for the sheet's entrance transform, retaining normal motion.
        await expect
          .poll(() =>
            modal.evaluate((element) => element.getAnimations().length),
          )
          .toBe(0);
        const body = await expectUsableBody(modal, size.height);
        const heading = modal.locator(".whatsapp-connect-heading");
        const contentBox = (await body.boundingBox())!;
        const headingBox = (await heading.boundingBox())!;
        expect(headingBox.y).toBeGreaterThanOrEqual(contentBox.y);
        expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(
          contentBox.y + contentBox.height,
        );
        await modal.screenshot({
          path: `node_modules/.cashly-qa/wa-sheet-${testInfo.project.name}-${size.width}-${theme}.png`,
        });
        const example = modal.getByRole("button", {
          name: "Coba dengan OTP contoh",
        });
        await example.scrollIntoViewIfNeeded();
        await expect(example).toBeInViewport();
        await example.click();
        await expect(modal).toHaveAccessibleName("Masukkan kode OTP");
        await expectUsableBody(modal, size.height);
        const shorter = Math.max(320, size.height - 200);
        await page.setViewportSize({ width: size.width, height: shorter });
        await expectUsableBody(modal, shorter);
        await modal.getByLabel("Kode OTP", { exact: true }).fill("123456");
        const connect = modal.getByRole("button", {
          name: "Sambungkan",
          exact: true,
        });
        await connect.scrollIntoViewIfNeeded();
        await expect(connect).toBeInViewport();
        await page.setViewportSize(size);
        await expectUsableBody(modal, size.height);
        await connect.click();
        await expect(modal).toHaveAccessibleName("WhatsApp contoh terhubung");
        await modal.getByRole("button", { name: "Tutup dialog" }).click();
        await expect(trigger).toBeFocused();
      } finally {
        await context.close();
      }
    });
  }
}
