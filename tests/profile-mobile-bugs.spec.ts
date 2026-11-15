import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function swipe(
  context: BrowserContext,
  page: Page,
  x: number,
  y: number,
  delta: number,
) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (const fraction of [0.1, 0.25, 0.45, 0.65, 0.85, 1]) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + delta * fraction, y }],
    });
    await page.waitForTimeout(20);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
}

test("Swipe pertama pada Spline aktif bekerja tanpa klik titik, tap masih diterima tombol", async ({
  browser,
}) => {
  test.setTimeout(45000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:3127/profil");
    const art = page.locator(".hero-carousel-art").first();
    const button = art.locator(".mascot-button");
    await art.scrollIntoViewIfNeeded();
    await expect(button).toHaveAttribute("data-scene-state", "ready", {
      timeout: 25000,
    });
    const canvas = await art.locator("canvas").elementHandle();
    const box = (await art.boundingBox())!;
    const x = box.x + box.width / 2 + 100;
    const y = box.y + box.height / 2;
    expect(
      await page.evaluate(
        ({ x, y }) =>
          !!document.elementFromPoint(x, y)?.closest(".mascot-button"),
        { x, y },
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
        { x, y },
      ),
    ).not.toBe("CANVAS");
    await button.evaluate((element) => {
      element.dataset.tapCount = "0";
      element.addEventListener("click", () => {
        element.dataset.tapCount = String(Number(element.dataset.tapCount) + 1);
      });
    });
    const scrollY = await page.evaluate(() => window.scrollY);
    await swipe(context, page, x, y, -220);
    await expect(page.locator(".hero-level-badge")).toHaveText("Level 2");
    await expect(button).toHaveAttribute("data-tap-count", "0");
    expect(
      Math.abs((await page.evaluate(() => window.scrollY)) - scrollY),
    ).toBeLessThan(3);
    const second = (await page
      .locator(".hero-carousel-art")
      .nth(1)
      .boundingBox())!;
    await swipe(
      context,
      page,
      second.x + second.width / 2 - 100,
      second.y + second.height / 2,
      220,
    );
    await expect(page.locator(".hero-level-badge")).toHaveText("Level 1");
    expect(
      await art
        .locator("canvas")
        .evaluate((element, original) => element === original, canvas),
    ).toBe(true);
    await button.tap();
    await expect(button).toHaveAttribute("data-tap-count", "1");
    await expect(button).toHaveAttribute("data-scene-state", "ready");
    await expect(page.locator(".hero-carousel-toolbar")).toContainText(
      "340 XP",
    );
  } finally {
    await context.close();
  }
});

declare global {
  interface Window {
    cashlyTestViewport: { resize: (height: number, top: number) => void };
  }
}

async function expectVisibleBounds(page: Page, top: number, bottom: number) {
  await expect
    .poll(async () => {
      const box = (await page.getByRole("dialog").boundingBox())!;
      return box.y >= top - 1 && box.y + box.height <= bottom + 1;
    })
    .toBe(true);
}

for (const theme of ["light", "dark"] as const) {
  for (const size of [
    { width: 320, height: 568 },
    { width: 390, height: 650 },
    { width: 844, height: 390 },
  ]) {
    test(`WhatsApp tetap di visual viewport, scroll dan OTP ${size.width}x${size.height} ${theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: size,
        isMobile: true,
        hasTouch: true,
        colorScheme: theme,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      try {
        await page.addInitScript(() => {
          const viewport = Object.assign(new EventTarget(), {
            width: innerWidth,
            height: innerHeight,
            offsetTop: 0,
            offsetLeft: 0,
            pageTop: 0,
            pageLeft: 0,
            scale: 1,
          });
          Object.defineProperty(window, "visualViewport", {
            configurable: true,
            value: viewport,
          });
          window.cashlyTestViewport = {
            resize(height, top) {
              viewport.height = height;
              viewport.offsetTop = top;
              viewport.dispatchEvent(new Event("resize"));
              viewport.dispatchEvent(new Event("scroll"));
            },
          };
        });
        await page.goto("http://127.0.0.1:3127/profil");
        // The init script runs before the viewport meta is parsed on mobile.
        await page.evaluate(
          (height) => window.cashlyTestViewport.resize(height, 0),
          size.height,
        );
        const trigger = page.getByRole("button", {
          name: /Catat via WhatsApp/,
        });
        await trigger.click();
        const modal = page.getByRole("dialog");
        await expect(modal).toHaveAccessibleName("Hubungkan WhatsApp");
        await expectVisibleBounds(page, 0, size.height);
        const height = Math.min(360, size.height - 80);
        const top = 50;
        await page.evaluate(
          ({ height, top }) => window.cashlyTestViewport.resize(height, top),
          { height, top },
        );
        await expectVisibleBounds(page, top, top + height);
        await expect(
          modal.getByRole("button", { name: "Tutup dialog", exact: true }),
        ).toBeVisible();
        const example = modal.getByRole("button", {
          name: "Coba dengan OTP contoh",
          exact: true,
        });
        await example.scrollIntoViewIfNeeded();
        const exampleBox = (await example.boundingBox())!;
        expect(exampleBox.y + exampleBox.height).toBeLessThanOrEqual(
          top + height + 1,
        );
        await example.click();
        await expect(modal).toHaveAccessibleName("Masukkan kode OTP");
        await expectVisibleBounds(page, top, top + height);
        const input = modal.getByLabel("Kode OTP", { exact: true });
        await input.fill("123456");
        const connect = modal.getByRole("button", {
          name: "Sambungkan",
          exact: true,
        });
        await connect.scrollIntoViewIfNeeded();
        const connectBox = (await connect.boundingBox())!;
        expect(connectBox.y).toBeGreaterThanOrEqual(top);
        expect(connectBox.y + connectBox.height).toBeLessThanOrEqual(
          top + height + 1,
        );
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await modal.screenshot({
          path: `node_modules/.cashly-qa/whatsapp-viewport-${size.width}-${theme}.png`,
        });
        await page.evaluate(
          (height) => window.cashlyTestViewport.resize(height, 0),
          size.height,
        );
        await expectVisibleBounds(page, 0, size.height);
        await connect.click();
        await expect(modal).toHaveAccessibleName("WhatsApp contoh terhubung");
        await expectVisibleBounds(page, 0, size.height);
        await modal
          .getByRole("button", { name: "Tutup dialog", exact: true })
          .click();
        await expect(trigger).toBeFocused();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      } finally {
        await context.close();
      }
    });
  }
}
