import { test, expect } from "@playwright/test";

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [390, 1280]) {
    test(`Weekly review removed; daily streak and reports remain ${width} ${colorScheme}`, async ({
      page,
      request,
    }) => {
      await request.get("http://127.0.0.1:34568/__test/profile-mode");
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.route("**/api/cashly/gamification/overview", async (route) => {
        const response = await route.fetch();
        const body = await response.json();
        body.data.missions = [
          {
            code: "weekly",
            title: "Review mingguan",
            completed: true,
            can_complete: false,
          },
        ];
        await route.fulfill({ response, json: body });
      });
      await page.route("**/api/cashly/reports/summary?**", (route) =>
        route.fulfill({ json: { data: { amount_idr: "28000", count: 1 } } }),
      );
      const weeklyRequests: string[] = [];
      page.on("request", (req) => {
        if (/weekly-story/.test(req.url())) weeklyRequests.push(req.url());
      });
      await page.goto("/login");
      await page
        .getByRole("button", { name: "Lanjutkan dengan Google" })
        .click();
      await expect(page).toHaveURL(/\/beranda/);
      await expect(page.locator(".streak-card")).toBeVisible();
      await expect(page.locator(".floating-category")).toHaveCount(4);
      await expect(page.locator(".missions-area")).toHaveCount(0);
      await expect(page.getByText(/Review (cerita )?mingguan/i)).toHaveCount(0);
      await page.screenshot({
        path: `test-results/home-no-weekly-${width}-${colorScheme}.png`,
        fullPage: true,
      });

      await page.goto("/laporan");
      await expect(page.locator(".report-total")).toContainText("Rp28.000");
      await expect(
        page.locator(".report-story-card, .report-reviewed"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Money Story|Selesai review/ }),
      ).toHaveCount(0);
      await page
        .getByRole("group", { name: "Periode laporan" })
        .getByRole("button", { name: "7 hari terakhir", exact: true })
        .click();
      await expect(page.locator(".report-trend-point")).toHaveCount(7);
      await expect(page.locator(".report-total")).toContainText("Rp28.000");
      await page.getByRole("button", { name: "Unduh", exact: true }).click();
      const modal = page.getByRole("dialog", { name: "Ekspor ringkasan" });
      await expect(modal).toContainText("Rp28.000");
      await expect(
        modal.getByRole("button", { name: "Cetak / PDF" }),
      ).toBeInViewport();
      await modal.getByRole("button", { name: "Tutup dialog" }).click();
      await page.screenshot({
        path: `test-results/reports-no-weekly-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      expect(weeklyRequests).toEqual([]);
    });
  }
}
