import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 360, 390, 430, 768, 1280, 1440]) {
  for (const theme of ["light", "dark"] as const) {
    test(`Login ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("/login");
      await expect(
        page.getByRole("heading", { name: "Selamat datang kembali!" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeVisible();
      await expect(page.getByText("Langkah kecil hari ini")).toBeVisible();
      await expect(page.getByText("Pelan-pelan, bareng Mochi.")).toBeVisible();
      await expect(
        page.getByText("Tanpa menghakimi. Selalu menemani."),
      ).toBeVisible();
      await expect(page.locator(".auth-brand-image")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({
        path: `test-results/login-${width}-${theme}.png`,
        fullPage: true,
      });
    });
  }
}

test("Login offers Google and email without a demo bypass", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeVisible();
  await expect(page.getByLabel("Kata sandi", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk ke demo" })).toHaveCount(0);
});
