import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
const android =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36";
test.use({ reducedMotion: "reduce" });

test("Metadata dan PNG instalasi memakai ikon Mochi valid, dengan fallback root", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  const icon = page.locator('link[rel="apple-touch-icon"]');
  await expect(icon).toHaveCount(1);
  await expect(icon).toHaveAttribute(
    "href",
    "/icons/apple-touch-icon-mochi-3.png",
  );
  const response = await request.get("/icons/apple-touch-icon-mochi-3.png");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const bytes = await response.body();
  const metadata = await sharp(bytes).metadata();
  expect([metadata.width, metadata.height, metadata.format]).toEqual([
    180,
    180,
    "png",
  ]);
  const fallback = await request.get("/apple-touch-icon.png");
  expect(await fallback.body()).toEqual(bytes);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  for (const item of manifest.icons as { src: string; sizes: string }[]) {
    const image = await request.get(item.src);
    expect(image.status()).toBe(200);
    const info = await sharp(await image.body()).metadata();
    expect(`${info.width}x${info.height}`).toBe(item.sizes);
  }
});

for (const platform of ["iphone", "ipad", "android", "desktop"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`Panduan ${platform} ${theme}: manual, bisa ditutup dan fokus kembali`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: platform === "desktop" ? 1280 : platform === "ipad" ? 768 : 390,
        height: 844,
      });
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript(
        ({ platform, iphone, android }) => {
          if (platform === "iphone" || platform === "android")
            Object.defineProperty(navigator, "userAgent", {
              configurable: true,
              get: () => (platform === "iphone" ? iphone : android),
            });
          if (platform === "ipad") {
            Object.defineProperty(navigator, "userAgent", {
              configurable: true,
              get: () =>
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
            });
            Object.defineProperty(navigator, "platform", {
              configurable: true,
              get: () => "MacIntel",
            });
            Object.defineProperty(navigator, "maxTouchPoints", {
              configurable: true,
              get: () => 5,
            });
          }
        },
        { platform, iphone, android },
      );
      const warnings: string[] = [];
      page.on("console", (message) => {
        if (/hydration|hydrated|server rendered HTML/i.test(message.text()))
          warnings.push(message.text());
      });
      await page.goto("/login");
      await expect(page.locator(".auth-header .install-entry")).toBeVisible();
      await expect(
        page.locator(".auth-form-section .install-entry"),
      ).toHaveCount(0);
      await expect(page.locator(".auth-header-actions")).not.toContainText(
        "Pratinjau",
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      const trigger = page.getByRole("button", {
        name: "Download Cashly",
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole("dialog", {
        name: "Download Cashly",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator(".install-steps > li")).toHaveCount(3);
      await expect(dialog).toContainText(
        platform === "iphone" || platform === "ipad"
          ? "Ketuk Bagikan"
          : platform === "android"
            ? "Buka menu Chrome"
            : "Buka melalui Chrome atau Edge",
      );
      await expect(
        dialog.getByRole("img", { name: "Ikon aplikasi Cashly" }),
      ).toBeVisible();
      expect(
        await dialog.evaluate(
          (node) => node.scrollWidth <= node.clientWidth + 1,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/install-${platform}-${theme}.png`,
      });
      await dialog
        .getByRole("button", { name: "Mengerti", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(warnings).toEqual([]);
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });
  }
}

test("Profil → panduan adalah satu submodal dengan Back dan fokus yang benar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/beranda");
  const profile = page.getByRole("button", { name: "Profil", exact: true });
  await profile.click();
  await expect(
    page.getByRole("dialog", { name: "Profil", exact: true }),
  ).toBeVisible();
  const install = page.getByRole("button", {
    name: "Download Cashly",
    exact: true,
  });
  await install.click();
  await expect(page.locator("dialog[open]")).toHaveCount(1);
  await expect(
    page.getByRole("dialog", { name: "Download Cashly", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Profil", exact: true }),
  ).toBeVisible();
  await expect(install).toBeFocused();
  await install.click();
  await page
    .getByRole("button", { name: "Kembali ke Profil", exact: true })
    .click();
  await expect(install).toBeFocused();
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await expect(profile).toBeFocused();
});

for (const mode of ["media", "legacy"] as const) {
  test(`Mode Home Screen ${mode} menyembunyikan ajakan instalasi`, async ({
    page,
  }) => {
    await page.addInitScript(
      ({ mode }) => {
        if (mode === "legacy")
          Object.defineProperty(navigator, "standalone", {
            configurable: true,
            get: () => true,
          });
        else {
          const match = window.matchMedia.bind(window);
          window.matchMedia = (query) => {
            const media = match(query);
            if (query === "(display-mode: standalone)")
              Object.defineProperty(media, "matches", { get: () => true });
            return media;
          };
        }
      },
      { mode },
    );
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Selamat datang kembali!" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download Cashly", exact: true }),
    ).toHaveCount(0);
    await page.goto("/beranda");
    await page.getByRole("button", { name: "Profil", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(
      "Cashly dibuka dari Home Screen",
    );
    await expect(
      page.getByRole("button", { name: "Download Cashly", exact: true }),
    ).toHaveCount(0);
  });
}

test("appinstalled menghapus ajakan dan menutup guide tanpa popup berikutnya", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Download Cashly", exact: true })
    .click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByRole("button", { name: "Download Cashly", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
