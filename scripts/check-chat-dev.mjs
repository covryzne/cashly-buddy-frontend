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
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /hydrat|server rendered HTML/i.test(message.text())
      )
        hydrationErrors.push(message.text());
    });
    await page.goto(new URL("/beranda", baseURL).href);
    await page
      .locator(".expense-summary")
      .getByRole("button", { name: "Catat pengeluaran" })
      .click();
    await page.getByRole("button", { name: /Chat manual/ }).click();
    const styles = await page
      .locator(".expense-chat-flow")
      .evaluate((dialog) => {
        const input = dialog.querySelector("textarea");
        const group = dialog.querySelector('[data-slot="input-group"]');
        const send = dialog.querySelector('[aria-label="Kirim catatan"]');
        const rect = send.getBoundingClientRect();
        return {
          display: getComputedStyle(dialog).display,
          direction: getComputedStyle(dialog).flexDirection,
          fontSize: getComputedStyle(input).fontSize,
          radius: getComputedStyle(group).borderRadius,
          opacity: getComputedStyle(group).opacity,
          sendVisible: rect.bottom <= window.innerHeight && rect.top >= 0,
        };
      });
    assert.equal(styles.display, "flex");
    assert.equal(styles.direction, "column");
    assert.equal(styles.fontSize, "16px");
    assert.equal(styles.radius, "22px");
    assert.equal(
      styles.opacity,
      "1",
      "Disabled send must not dim the entire composer",
    );
    assert.equal(styles.sendVisible, true);
    await page
      .getByRole("textbox", { name: "Catatan pengeluaran" })
      .fill("kopi");
    await page.getByRole("button", { name: "Kirim catatan" }).click();
    await expect(page.getByRole("log")).toContainText("Nominalnya berapa");
    await expect(page.locator(".chat-day-divider")).toHaveText("Hari ini");
    await expect(page.locator(".expense-message-user time")).toHaveText(
      /\d{2}\.\d{2} WIB/,
    );
    const time = await page
      .locator(".expense-message-user time")
      .getAttribute("datetime");
    await page
      .getByRole("button", { name: "Tutup dialog", exact: true })
      .click();
    await page
      .locator(".expense-summary")
      .getByRole("button", { name: "Catat pengeluaran" })
      .click();
    await page.getByRole("button", { name: /Chat manual/ }).click();
    await expect(page.getByRole("log")).toContainText("Nominalnya berapa");
    await expect(page.locator(".expense-message-user time")).toHaveAttribute(
      "datetime",
      time,
    );
    await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill("12k");
    await page.getByRole("button", { name: "Kirim catatan" }).click();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill("roti 8k");
    await page.getByRole("button", { name: "Kirim catatan" }).click();
    await expect(page.getByRole("button", { name: /^Tinjau 2 pengeluaran/ })).toContainText("Rp20.000");
    await page.screenshot({
      path: `node_modules/.cashly-qa/chat-session-${colorScheme}.png`,
    });
    await page.getByRole("button", { name: /^Tinjau 2 pengeluaran/ }).click();
    await expect(page.getByRole("dialog", { name: "Analisis catatan", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
    await expect(page.locator(".chat-batch-entry")).toHaveCount(2);
    await page.screenshot({ path: `node_modules/.cashly-qa/chat-batch-preview-${colorScheme}.png` });
    assert.deepEqual(hydrationErrors, []);
    console.log(
      `${colorScheme}: dev chat OK — batch, explicit analysis, timestamp, reopen and clean hydration`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
