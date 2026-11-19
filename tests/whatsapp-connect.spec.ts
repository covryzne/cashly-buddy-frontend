import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const modal = (page: Page) => page.getByRole("dialog");
async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/profil");
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(modal(page)).toHaveAccessibleName("Hubungkan WhatsApp");
  await expect(
    modal(page).getByRole("button", { name: "Mengerti", exact: true }),
  ).toHaveCount(0);
  await expect(modal(page).locator(".dialog-footer")).toHaveCount(0);
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 390, 1280]) {
    test(`WhatsApp contoh, OTP, Back dan session state ${width} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (/hydrat|server rendered HTML/i.test(message.text()))
          errors.push(message.text());
      });
      await open(page);
      await expect(modal(page)).toContainText(
        "OTP contoh belum mendaftarkan nomor WhatsApp",
      );
      await expect(
        modal(page).locator(".whatsapp-connect-steps li"),
      ).toHaveCount(3);
      await modal(page)
        .getByRole("button", { name: "Coba dengan OTP contoh", exact: true })
        .click();
      await expect(modal(page)).toHaveAccessibleName("Masukkan kode OTP");
      await expect(
        modal(page)
          .locator("form")
          .getByRole("button", { name: "Sambungkan", exact: true }),
      ).toHaveCount(1);
      await expect(modal(page).locator(".dialog-footer")).toHaveCount(0);
      await expect(
        modal(page).getByRole("button", { name: "Kembali", exact: true }),
      ).toBeVisible();
      await modal(page)
        .getByRole("button", { name: "Sambungkan", exact: true })
        .click();
      await expect(modal(page).getByRole("alert")).toHaveText(
        "Masukkan enam digit kode OTP.",
      );
      await expect(
        modal(page).getByLabel("Kode OTP", { exact: true }),
      ).toBeFocused();
      await modal(page).getByLabel("Kode OTP", { exact: true }).fill("123 456");
      await expect(
        modal(page).getByLabel("Kode OTP", { exact: true }),
      ).toHaveValue("123456");
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(
        await modal(page).evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await expect(
        modal(page).getByRole("button", {
          name: "Sambungkan",
          exact: true,
        }),
      ).toBeInViewport({ ratio: 1 });
      await modal(page).screenshot({
        path: `node_modules/.cashly-qa/whatsapp-otp-${width}-${theme}.png`,
      });
      await modal(page)
        .getByRole("button", { name: "Kembali", exact: true })
        .click();
      await expect(
        modal(page).getByRole("button", {
          name: "Coba dengan OTP contoh",
          exact: true,
        }),
      ).toBeFocused();
      await modal(page)
        .getByRole("button", { name: "Coba dengan OTP contoh", exact: true })
        .click();
      await modal(page)
        .getByRole("button", { name: "Isi kode contoh", exact: true })
        .click();
      await modal(page)
        .getByRole("button", { name: "Sambungkan", exact: true })
        .click();
      await expect(modal(page)).toHaveAccessibleName(
        "WhatsApp contoh terhubung",
      );
      await expect(
        modal(page).getByRole("button", { name: "Mengerti", exact: true }),
      ).toHaveCount(0);
      await expect(modal(page)).toContainText(
        "Belum ada nomor yang didaftarkan",
      );
      await modal(page)
        .getByRole("button", { name: "Tutup dialog", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: /Catat via WhatsApp.*Contoh terhubung/,
        }),
      ).toBeFocused();
      await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
      await modal(page)
        .getByRole("button", { name: "Reset koneksi contoh", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: /Catat via WhatsApp.*Hubungkan/ }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

test("Kode salah dibatasi; kedaluwarsa dan mulai ulang tidak menghubungkan akun", async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  await modal(page)
    .getByRole("button", { name: "Coba dengan OTP contoh", exact: true })
    .click();
  for (let i = 0; i < 5; i++) {
    await modal(page).getByLabel("Kode OTP", { exact: true }).fill("000000");
    await modal(page)
      .getByRole("button", { name: "Sambungkan", exact: true })
      .click();
  }
  await expect(modal(page).getByRole("alert")).toContainText(
    "Batas percobaan contoh tercapai",
  );
  await expect(
    modal(page).getByLabel("Kode OTP", { exact: true }),
  ).toBeDisabled();
  await modal(page)
    .getByRole("button", { name: "Mulai ulang kode", exact: true })
    .click();
  await expect(
    modal(page).getByLabel("Kode OTP", { exact: true }),
  ).toBeEnabled();
  await page.clock.fastForward(300001);
  await expect(modal(page).getByRole("alert")).toContainText("kedaluwarsa");
  await expect(
    modal(page).getByLabel("Kode OTP", { exact: true }),
  ).toBeDisabled();
  await modal(page)
    .getByRole("button", { name: "Mulai ulang kode", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: "Isi kode contoh", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: "Sambungkan", exact: true })
    .click();
  await expect(modal(page)).toHaveAccessibleName("WhatsApp contoh terhubung");
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Catat via WhatsApp.*Hubungkan/ }),
  ).toBeVisible();
});

test("Bot belum dikonfigurasi atau status gagal tetap memberi jalur contoh", async ({
  page,
}) => {
  await page.route("**/api/whatsapp/connect?mode=availability", (route) =>
    route.fulfill({ json: { configured: false } }),
  );
  await open(page);
  await expect(
    modal(page).getByRole("button", { name: "Buka WhatsApp", exact: true }),
  ).toBeDisabled();
  await expect(modal(page)).toContainText("Chat bot belum tersedia");
  await modal(page)
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await page.unroute("**/api/whatsapp/connect?mode=availability");
  await page.route("**/api/whatsapp/connect?mode=availability", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: /Catat via WhatsApp/ }).click();
  await expect(modal(page)).toContainText("Chat belum dapat diperiksa");
  await modal(page)
    .getByRole("button", { name: "Coba dengan OTP contoh", exact: true })
    .click();
  await expect(modal(page)).toHaveAccessibleName("Masukkan kode OTP");
});

test("Nomor konfigurasi hanya muncul di redirect server, bukan halaman/bundle/status", async ({
  page,
  request,
}) => {
  const number = process.env.WHATSAPP_BOT_NUMBER;
  test.skip(
    !number,
    "Run with a fictional server-only WHATSAPP_BOT_NUMBER to check configured redirect.",
  );
  const availability = await request.get(
    "/api/whatsapp/connect?mode=availability",
  );
  expect(await availability.json()).toEqual({ configured: true });
  expect(availability.headers()["cache-control"]).toContain("no-store");
  const response = await request.get(
    "/api/whatsapp/connect?next=https://invalid.example",
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  const target = new URL(response.headers().location);
  expect(target.origin).toBe("https://wa.me");
  expect(target.pathname).toBe(`/${number}`);
  expect(target.searchParams.get("text")).toContain("OTP");
  expect(response.headers()["cache-control"]).toContain("no-store");
  await open(page);
  const chat = modal(page).getByRole("link", {
    name: "Buka WhatsApp",
    exact: false,
  });
  await expect(chat).toHaveAttribute("href", "/api/whatsapp/connect");
  await expect(chat).toHaveAttribute("target", "_blank");
  expect(await page.content()).not.toContain(number!);
  const files = readdirSync(".next/static", { recursive: true }).filter(
    (entry) => String(entry).endsWith(".js"),
  );
  expect(
    files.some((entry) =>
      readFileSync(join(".next/static", String(entry)), "utf8").includes(
        number!,
      ),
    ),
  ).toBe(false);
});

test("Buka WhatsApp berpindah ke input OTP sambil membuka tab chat", async ({
  page,
  context,
}) => {
  test.skip(
    !process.env.WHATSAPP_BOT_NUMBER,
    "Needs fictional configured number.",
  );
  // Stub the initial navigation: browser redirects can bypass a later URL route.
  // The real redirect Location is tested separately without following it.
  await context.route("**/api/whatsapp/connect", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<title>Chat stub</title><p>Local test. No message sent.</p>",
    }),
  );
  await open(page);
  const newPage = context.waitForEvent("page");
  await modal(page)
    .getByRole("link", { name: /Buka WhatsApp/ })
    .click();
  const chat = await newPage;
  await chat.waitForLoadState("domcontentloaded");
  expect(new URL(chat.url()).pathname).toBe("/api/whatsapp/connect");
  await chat.close();
  await expect(modal(page)).toHaveAccessibleName("Masukkan kode OTP");
  await expect(modal(page)).toContainText("Kembali dari WhatsApp?");
  await modal(page)
    .getByRole("button", { name: "Isi kode contoh", exact: true })
    .click();
  await modal(page)
    .getByRole("button", { name: "Sambungkan", exact: true })
    .click();
  await expect(modal(page)).toHaveAccessibleName("WhatsApp contoh terhubung");
});
