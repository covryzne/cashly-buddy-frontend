import { test, expect, type Locator } from "@playwright/test";

async function expectUsableSheet(modal: Locator, height: number) {
  await expect(modal).toBeVisible();
  const body = modal.locator(":scope > .dialog-content");
  const fixedHeight = await modal.evaluate((element) =>
    Array.from(element.children)
      .filter((child) => !child.classList.contains("dialog-content"))
      .reduce((sum, child) => sum + child.getBoundingClientRect().height, 0),
  );
  await expect
    .poll(() => body.evaluate((element) => element.clientHeight))
    .toBeGreaterThan(Math.min(220, Math.max(70, height - fixedHeight - 70)));
  const box = (await modal.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  expect(await modal.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(
    modal.getByRole("button", { name: "Tutup dialog" }),
  ).toBeInViewport({ ratio: 1 });
  for (const button of await modal
    .locator(":scope > .dialog-footer button")
    .all()) {
    await expect(button).toBeInViewport({ ratio: 1 });
  }
  return body;
}

async function openFrom(trigger: Locator) {
  // Keyboard origin permits the same focus-restoration checks on WebKit/Chrome.
  await trigger.focus();
  await trigger.press("Enter");
}

for (const theme of ["light", "dark"] as const) {
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1280, height: 900 },
  ]) {
    test(`Export, Install and Mochi category sheets ${size.width}x${size.height} ${theme}`, async ({
      browser,
    }, testInfo) => {
      test.setTimeout(45000);
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport: size,
        isMobile: size.width < 1000,
        hasTouch: true,
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      try {
        await page.clock.setFixedTime(new Date("2026-11-15T12:00:00+07:00"));
        await page.goto("/laporan");
        for (const name of ["Bagikan ringkasan laporan", "Unduh"]) {
          const trigger = page.getByRole("button", { name, exact: true });
          await openFrom(trigger);
          const modal = page.getByRole("dialog", {
            name: "Ekspor ringkasan",
            exact: true,
          });
          const body = await expectUsableSheet(modal, size.height);
          await expect(
            body.getByRole("heading", {
              name: "Ringkasan yang siap kamu simpan.",
            }),
          ).toBeInViewport();
          const tip = modal.locator(".report-export-tip");
          await tip.scrollIntoViewIfNeeded();
          const tipBox = (await tip.boundingBox())!;
          const footerBox = (await modal
            .locator(".dialog-footer")
            .boundingBox())!;
          expect(tipBox.y + tipBox.height).toBeLessThanOrEqual(footerBox.y + 1);
          if (name === "Unduh") {
            await modal.screenshot({
              path: `node_modules/.cashly-qa/shared-export-${testInfo.project.name}-${size.width}-${theme}.png`,
            });
          }
          await page.keyboard.press("Escape");
          await expect(trigger).toBeFocused();
        }
        await page.goto("/beranda");
        const cards = page.locator(".floating-category");
        await expect(cards).toHaveCount(4);
        for (let index = 0; index < 4; index++) {
          const trigger = cards.nth(index);
          await openFrom(trigger);
          const modal = page.getByRole("dialog");
          await expectUsableSheet(modal, size.height);
          await expect(modal.locator(".category-period")).toBeInViewport({
            ratio: 1,
          });
          if (index === 0) {
            await modal.screenshot({
              path: `node_modules/.cashly-qa/shared-category-${testInfo.project.name}-${size.width}-${theme}.png`,
            });
            const row = modal.getByRole("button", { name: /Kopi Sudut/ });
            await openFrom(row);
            await expect(modal).toHaveAccessibleName("Detail pengeluaran");
            await expectUsableSheet(modal, size.height);
            await modal
              .getByRole("button", { name: "Kembali", exact: true })
              .click();
            await expect(row).toBeFocused();
            await modal
              .getByRole("button", { name: "Catat pengeluaran", exact: true })
              .click();
            await expect(modal).toHaveAccessibleName("Catat pengeluaran baru");
            await expectUsableSheet(modal, size.height);
            await modal
              .getByRole("button", { name: "Kembali", exact: true })
              .click();
            await expectUsableSheet(modal, size.height);
          }
          await page.keyboard.press("Escape");
          await expect(trigger).toBeFocused();
        }
        await page.goto("/login");
        const install = page.getByRole("button", {
          name: "Install",
          exact: true,
        });
        await openFrom(install);
        const modal = page.getByRole("dialog", {
          name: "Download Cashly",
          exact: true,
        });
        await expectUsableSheet(modal, size.height);
        await expect(modal.locator(".install-guide-app")).toBeInViewport();
        await modal.locator(".install-guide-note").scrollIntoViewIfNeeded();
        await expect(modal.locator(".install-guide-note")).toBeInViewport();
        await modal.screenshot({
          path: `node_modules/.cashly-qa/shared-install-${testInfo.project.name}-${size.width}-${theme}.png`,
        });
        await page.keyboard.press("Escape");
        await expect(install).toBeFocused();
      } finally {
        await context.close();
      }
    });
  }
}
