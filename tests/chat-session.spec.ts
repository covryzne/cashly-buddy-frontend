import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chatDayLabel, wibDayKey } from "../src/lib/format/datetime";

test.use({ reducedMotion: "reduce", timezoneId: "America/Los_Angeles" });
async function openChat(page: Page, navigate = true) {
  if (navigate) await page.goto("/beranda");
  await page
    .locator(".expense-summary")
    .getByRole("button", { name: "Catat pengeluaran" })
    .click();
  await page.getByRole("button", { name: /Chat manual/ }).click();
}
async function send(page: Page, value: string) {
  await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill(value);
  await page.getByRole("button", { name: "Kirim catatan" }).click();
}
async function close(page: Page) {
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
}
async function preview(page: Page) {
  await page.getByRole("button", { name: /^Tinjau \d+ pengeluaran/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true }),
  ).toBeVisible();
}

for (const [timestamp, today, expected] of [
  ["2026-11-13T16:59:00Z", "2026-11-13", "Hari ini"],
  ["2026-11-13T17:01:00Z", "2026-11-14", "Hari ini"],
  ["2026-11-13T16:59:00Z", "2026-11-14", "Kemarin"],
  ["2026-11-10T17:00:00Z", "2026-11-14", "11 November 2026"],
  ["2026-11-13T17:01:00Z", null, "14 November 2026"],
] as const) {
  test("Label hari WIB " + timestamp + " relatif " + today, () => {
    expect(chatDayLabel(timestamp, today)).toBe(expected);
  });
}

test("Draft belum dikirim bertahan pada Close/Back; refresh memulai state kosong", async ({
  page,
}) => {
  await openChat(page);
  const input = page.getByRole("textbox", { name: "Catatan pengeluaran" });
  await input.fill("kopi yang belum dikirim");
  await close(page);
  await openChat(page, false);
  await expect(input).toHaveValue("kopi yang belum dikirim");
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await page.getByRole("button", { name: /Chat manual/ }).click();
  await expect(input).toHaveValue("kopi yang belum dikirim");
  await close(page);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => key !== "cashly-theme"),
    ),
  ).toEqual([]);
  await page.reload();
  await openChat(page, false);
  await expect(input).toHaveValue("");
});

test("Klarifikasi, detail transaksi dan snapshot konfirmasi bertahan saat reopen", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-14T10:39:00Z"));
  await openChat(page);
  await send(page, "kopi");
  await expect(page.getByRole("log")).toContainText("Nominalnya berapa");
  const originalTime = await page
    .locator(".expense-message-user time")
    .getAttribute("datetime");
  await close(page);
  await openChat(page, false);
  await expect(page.getByRole("log")).toContainText("Nominalnya berapa");
  await expect(page.locator(".expense-message-user time")).toHaveAttribute(
    "datetime",
    originalTime!,
  );
  await send(page, "12k");
  await preview(page);
  await page
    .getByRole("button", { name: "Ubah pengeluaran 1", exact: true })
    .click();
  await page.getByLabel("Harga satuan item 1", { exact: true }).fill("15000");
  const transactionDate = await page
    .getByLabel("Tanggal pengeluaran", { exact: true })
    .textContent();
  await close(page);
  await openChat(page, false);
  await expect(
    page.getByRole("dialog", { name: "Rincian pengeluaran", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Harga satuan item 1", { exact: true }),
  ).toHaveValue("15000");
  expect(
    await page.getByLabel("Tanggal pengeluaran", { exact: true }).textContent(),
  ).toBe(transactionDate);
  await page
    .getByRole("button", { name: "Selesai mengubah", exact: true })
    .click();
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  await expect(page.locator(".chat-batch-source p")).toBeVisible();
  await expect(page.locator(".chat-batch-source")).toContainText("kopi 12k");
  await expect(page.locator(".chat-batch-confirmed-time")).toContainText(
    "17.39 WIB",
  );
  await expect(page.locator(".scan-success-hero")).toContainText("Rp15.000");
  const confirmedAt = await page
    .locator(".chat-batch-confirmed-time time")
    .getAttribute("datetime");
  await page
    .getByRole("button", { name: "Kembali ke Beranda", exact: true })
    .click();
  await page.clock.setFixedTime(new Date("2026-11-15T10:39:00Z"));
  await openChat(page, false);
  await expect(
    page.getByRole("dialog", { name: "Konfirmasi pengeluaran", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".chat-batch-confirmed-time time")).toHaveAttribute(
    "datetime",
    confirmedAt!,
  );
  await expect(page.locator(".chat-batch-source p")).toBeVisible();
  await expect(page.locator(".chat-batch-source")).toContainText("kopi 12k");
  await page.getByRole("button", { name: "Catat lagi", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Catatan pengeluaran" }),
  ).toHaveValue("");
  await expect(page.getByRole("log")).not.toContainText("kopi");
  await close(page);
  await openChat(page, false);
  await expect(page.getByRole("button", { name: /^Tinjau/ })).toHaveCount(0);
});

test("Close selama analisis mempertahankan daftar tanpa mengirim ulang atau menggandakan transaksi", async ({
  page,
}) => {
  await openChat(page);
  await page.clock.install();
  await send(page, "kopi 12k");
  await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
  await close(page);
  await page.clock.runFor(5000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openChat(page, false);
  await expect(
    page.getByRole("textbox", { name: "Catatan pengeluaran" }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }),
  ).toContainText("Rp12.000");
  await send(page, "roti 8k");
  await page.getByRole("button", { name: /^Tinjau 2 pengeluaran/ }).click();
  await page.clock.runFor(2500);
  await expect(page.locator(".chat-batch-overview > .money")).toHaveText(
    "Rp20.000",
  );
  await expect(page.locator(".chat-batch-entry")).toHaveCount(2);
});

for (const [width, theme] of [
  [320, "dark"],
  [390, "light"],
] as const) {
  test(
    "Pemisah hari dan jam WIB " +
      width +
      "px " +
      theme +
      " melintasi tengah malam",
    async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme });
      await page.clock.setFixedTime(new Date("2026-11-13T16:59:00Z"));
      await openChat(page);
      await send(page, "kopi");
      await expect(page.getByRole("log")).toContainText("Nominalnya berapa");
      await expect(page.locator(".chat-day-divider")).toHaveText("Hari ini");
      await expect(page.locator(".expense-message-user time")).toHaveText(
        "23.59 WIB",
      );
      await page.clock.setFixedTime(new Date("2026-11-13T17:01:00Z"));
      await send(page, "12k");
      await expect(page.locator(".chat-day-divider")).toHaveText([
        "Kemarin",
        "Hari ini",
      ]);
      await expect(page.locator(".expense-message-user time")).toHaveText([
        "23.59 WIB",
        "00.01 WIB",
      ]);
      expect(
        wibDayKey(
          (await page
            .locator(".expense-message-user time")
            .last()
            .getAttribute("datetime"))!,
        ),
      ).toBe("2026-11-14");
      expect(
        await page
          .locator(".expense-chat-flow")
          .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
      ).toBe(true);
      const log = page.getByRole("log");
      const scroller = page.locator(".expense-chat-flow .dialog-content");
      await log.focus();
      await scroller.evaluate((node) => {
        node.scrollTop = 0;
      });
      await log.press("ArrowDown");
      await expect
        .poll(() => scroller.evaluate((node) => node.scrollTop))
        .toBeGreaterThan(0);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: "test-results/chat-time-" + width + "-" + theme + ".png",
      });
    },
  );
}
