import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`Warmup dan reload menjaga alpha logo/avatar/login ${theme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("seeded-old-asset-cache")) {
        sessionStorage.setItem("seeded-old-asset-cache", "yes");
        void caches.open("cashly-public-assets-v2");
      }
    });
    await page.goto("/login");
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    const urls = [
      "/_next/image?url=%2Fmascot%2Fmochi-crown-transparent.webp&w=128&q=75",
      "/_next/image?url=%2Fbranding%2Fcashly-header.webp&w=128&q=75",
    ];
    await page.evaluate(
      (images) =>
        navigator.serviceWorker.controller!.postMessage({
          type: "WARM_PUBLIC_ASSETS",
          images,
          includeScene: false,
        }),
      urls,
    );
    await expect
      .poll(() =>
        page.evaluate(async (paths) => {
          const names = await caches.keys();
          if (names.includes("cashly-public-assets-v2")) return false;
          const cache = await caches.open("cashly-public-assets-v3-alpha");
          return (
            await Promise.all(
              paths.map((path) =>
                cache.match(
                  new Request(new URL(path, location.origin), {
                    headers: { Accept: "image/webp" },
                  }),
                ),
              ),
            )
          ).every(Boolean);
        }, urls),
      )
      .toBe(true);
    const pixels = await page.evaluate(
      async (paths) =>
        Promise.all(
          paths.map(async (path) => {
            // This generic Accept reproduced the original JPEG/black-matte warmup bug.
            const response = await fetch(path);
            const bitmap = await createImageBitmap(await response.blob());
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(bitmap, 0, 0);
            const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
            bitmap.close();
            return { type: response.headers.get("content-type"), alpha };
          }),
        ),
      urls,
    );
    expect(pixels).toEqual([
      { type: "image/webp", alpha: 0 },
      { type: "image/webp", alpha: 0 },
    ]);
    await page.reload();
    for (const selector of [".auth-mascot", ".auth-brand-image"]) {
      const image = page.locator(selector);
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      expect(
        await image.evaluate((element: HTMLImageElement) => {
          const canvas = document.createElement("canvas");
          canvas.width = element.naturalWidth;
          canvas.height = element.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(element, 0, 0);
          return ctx.getImageData(0, 0, 1, 1).data[3];
        }),
      ).toBe(0);
    }
    await page.screenshot({
      path: `node_modules/.cashly-qa/auth-alpha-${theme}.png`,
      fullPage: true,
    });
    await page.goto("/profil");
    const avatar = page.locator(".profile-account-card .profile-avatar img");
    await expect
      .poll(() =>
        avatar.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(
      await avatar.evaluate((element: HTMLImageElement) => {
        const canvas = document.createElement("canvas");
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(element, 0, 0);
        return ctx.getImageData(0, 0, 1, 1).data[3];
      }),
    ).toBe(0);
  });
}
