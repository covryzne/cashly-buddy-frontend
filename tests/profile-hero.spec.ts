import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const theme of ["light", "dark"] as const) {
  test(`Hero 1–5, syarat, redup, info/fokus dan XP tetap konsisten ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/profil");
    const carousel = page.getByRole("region", {
      name: "Hero Mochi",
      exact: true,
    });
    await carousel.scrollIntoViewIfNeeded();
    await expect(
      page.locator(".profile-account-card .profile-badges"),
    ).toHaveCount(0);
    await expect(carousel.locator(".hero-level-badge")).toHaveText("Level 1");
    const xp = carousel.locator(".profile-account-kind");
    await expect(xp).toHaveText("340 XP terkumpul");
    const xpBox = (await xp.boundingBox())!;
    const levelBox = (await carousel
      .locator(".hero-level-badge")
      .boundingBox())!;
    expect(xpBox.x + xpBox.width).toBeLessThan(levelBox.x);
    const streak = (await carousel
      .locator(".hero-carousel-streak")
      .boundingBox())!;
    const artBox = (await carousel
      .locator(".hero-carousel-art")
      .first()
      .boundingBox())!;
    expect(streak.y + streak.height).toBeLessThanOrEqual(artBox.y);
    await expect(carousel).not.toContainText(
      /Teman kecilmu|Hai, Nara|Hero level|Sedang dipakai|Little Cashly|Sepuluh hari|Terbuka pada|Terkunci/,
    );
    await expect(
      carousel.locator(".hero-carousel-navigation .icon-button"),
    ).toHaveCount(0);
    await expect(page.locator(".profile-evolution-progress")).not.toContainText(
      "Tahap yang sudah terbuka",
    );
    await expect(carousel.locator(".mascot-button")).toHaveCount(1);
    await expect(page.locator(".profile-mochi-card")).not.toContainText(
      "Level XP dan evolusi Mochi",
    );
    expect(
      Number.parseFloat(
        await carousel
          .locator(".hero-carousel-streak")
          .evaluate((element) => getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(14);
    const mascot = await carousel.locator(".mascot-button").elementHandle();
    const requirements = [10, 30, 100, 150, 200];
    for (let level = 1; level <= 5; level++) {
      await carousel
        .getByRole("button", { name: `Lihat hero level ${level}`, exact: true })
        .click();
      const slide = carousel.locator("article:not([inert])");
      await expect(slide).toHaveAttribute(
        "aria-label",
        new RegExp(`Mochi level ${level},`),
      );
      await expect(carousel.locator(".hero-level-badge")).toHaveText(
        `Level ${level}`,
      );
      expect(
        await carousel
          .locator(".mascot-button")
          .evaluate((element, initial) => element === initial, mascot),
      ).toBe(true);
      const art = slide.locator(".hero-carousel-art");
      if (level > 1) {
        const expected =
          level === 5
            ? "/mascot/mochi-crown-transparent.png"
            : `/mascot/mochi-level-${level}.webp`;
        expect(
          await art
            .locator(".hero-stage-image")
            .evaluate((element: HTMLImageElement) =>
              new URL(element.src).searchParams.get("url"),
            ),
        ).toBe(expected);
        await expect(art).toHaveClass(/is-locked/);
        expect(
          Number(
            await art
              .locator(".hero-carousel-renderer")
              .evaluate((element) => getComputedStyle(element).opacity),
          ),
        ).toBeLessThan(0.5);
        await expect(art.locator(".hero-carousel-renderer")).toHaveAttribute(
          "inert",
          "",
        );
      } else await expect(art).not.toHaveClass(/is-locked/);
      const info = slide.getByRole("button", {
        name: `Info hero level ${level}`,
        exact: true,
      });
      await info.click();
      const modal = page.getByRole("dialog");
      const detail = modal.locator(".evolution-guide-list li.is-highlighted");
      await expect(detail).toContainText(
        `${requirements[level - 1]} hari streak`,
      );
      await expect(detail).toContainText(level === 1 ? "Dipakai" : "Terkunci");
      await modal
        .getByRole("button", { name: "Mengerti", exact: true })
        .click();
      await expect(info).toBeFocused();
      await expect(
        carousel.getByRole("button", {
          name: `Lihat hero level ${level}`,
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true");
    }
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.locator(".profile-mochi-card").screenshot({
      path: `node_modules/.cashly-qa/profile-hero-locked-${theme}.png`,
    });
    await carousel.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      carousel.getByRole("button", { name: "Lihat hero level 4", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(carousel.locator(".hero-level-badge")).toHaveText("Level 4");
    expect(
      await carousel.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await carousel
      .getByRole("button", { name: "Lihat hero level 1", exact: true })
      .click();
    await carousel
      .getByRole("button", { name: "Sapa Mochi", exact: true })
      .click();
    await expect(carousel.locator(".profile-mochi-speech")).toHaveCount(0);
    await expect(xp).toHaveText("340 XP terkumpul");
    await page.locator(".profile-mochi-card").screenshot({
      path: `node_modules/.cashly-qa/profile-hero-current-${theme}.png`,
    });
  });
}

test("Swipe langsung di hero menggeser slide tanpa menyapa atau menambah XP", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3127/profil");
  const art = page.locator(".hero-carousel-art").first();
  await art.scrollIntoViewIfNeeded();
  const box = (await art.boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const y = box.y + box.height / 2;
  const from = box.x + box.width / 2 + 110;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from, y }],
  });
  for (const offset of [20, 50, 90, 130, 180, 220]) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: from - offset, y }],
    });
    await page.waitForTimeout(20);
  }
  expect((await art.boundingBox())!.x).toBeLessThan(box.x - 40);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(page.locator(".hero-level-badge")).toHaveText("Level 2");
  await expect(page.locator(".profile-mochi-speech")).toHaveCount(0);
  await expect(page.locator(".hero-carousel .profile-account-kind")).toHaveText(
    "340 XP terkumpul",
  );
  await context.close();
});

test("Carousel memakai satu scene Spline yang tetap hidup saat berganti hero", async ({
  page,
}) => {
  test.setTimeout(45000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/profil");
  const art = page.locator(".hero-carousel-art").first();
  await art.scrollIntoViewIfNeeded();
  await expect(art.locator(".mascot-button")).toHaveAttribute(
    "data-scene-state",
    "ready",
    { timeout: 25000 },
  );
  const canvas = await art.locator("canvas").elementHandle();
  for (const level of [2, 5, 1]) {
    await page
      .getByRole("button", { name: `Lihat hero level ${level}`, exact: true })
      .click();
    await expect(page.locator(".hero-level-badge")).toHaveText(
      `Level ${level}`,
    );
    await expect(art.locator("canvas")).toHaveCount(1);
    expect(
      await art
        .locator("canvas")
        .evaluate((element, original) => element === original, canvas),
    ).toBe(true);
    await expect(art.locator(".mascot-button")).toHaveAttribute(
      "data-scene-state",
      "ready",
    );
  }
  await page
    .locator(".profile-mochi-card")
    .screenshot({ path: "node_modules/.cashly-qa/profile-hero-spline.png" });
  expect(errors).toEqual([]);
});
