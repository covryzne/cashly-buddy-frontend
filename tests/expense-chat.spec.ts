import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ reducedMotion: "reduce" });
async function openChat(page: Page, navigate = true) {
  if (navigate) await page.goto("/beranda");
  await page
    .locator(".expense-summary")
    .getByRole("button", { name: "Catat pengeluaran" })
    .click();
  await page.getByRole("button", { name: /Chat manual/ }).click();
}
async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Catatan pengeluaran" }).fill(text);
  await page.getByRole("button", { name: "Kirim catatan" }).click();
  await expect(
    page.getByRole("dialog", { name: "Chat manual", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
}
async function preview(page: Page) {
  await page.getByRole("button", { name: /^Tinjau \d+ pengeluaran/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Analisis catatan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Progres analisis catatan" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true }),
  ).toBeVisible();
}

for (const width of [320, 390, 1280])
  for (const theme of ["light", "dark"] as const) {
    test(
      "Batch " +
        width +
        "px " +
        theme +
        ": dua pesan, satu analisis, edit dan hapus terpisah",
      async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme: theme });
        const mutations: string[] = [];
        page.on("request", (request) => {
          if (request.method() !== "GET") mutations.push(request.url());
        });
        await page.addInitScript(() => {
          navigator.mediaDevices.getUserMedia = () => {
            throw new Error("Chat must not request media");
          };
        });
        await openChat(page);
        await expect(
          page.getByRole("button", { name: "Kirim catatan" }),
        ).toBeDisabled();
        await expect(
          page.getByRole("textbox", { name: "Catatan pengeluaran" }),
        ).toHaveCSS("font-size", "16px");
        await send(page, "makan naspad 25k");
        await send(page, "kopi 20k");
        await expect(page.getByRole("log")).toContainText(
          "Ada 2 pengeluaran, total Rp45.000",
        );
        const cta = page.getByRole("button", {
          name: "Tinjau 2 pengeluaran · Rp45.000",
          exact: true,
        });
        await expect(cta).toBeInViewport({ ratio: 1 });
        await expect(page.getByRole("log")).toContainText(
          "masuk daftar untuk ditinjau",
        );
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: "test-results/batch-chat-" + width + "-" + theme + ".png",
        });
        await preview(page);
        await expect(page.locator(".chat-batch-entry")).toHaveCount(2);
        await expect(page.locator(".chat-batch-overview > .money")).toHaveText(
          "Rp45.000",
        );
        await page
          .getByRole("button", { name: "Ubah pengeluaran 1", exact: true })
          .click();
        await expect(
          page.getByLabel("Nama item 1", { exact: true }),
        ).toHaveValue("makan naspad");
        await page
          .getByLabel("Harga satuan item 1", { exact: true })
          .fill("30000");
        await page
          .getByRole("button", { name: "Selesai mengubah", exact: true })
          .click();
        await expect(page.locator(".chat-batch-overview > .money")).toHaveText(
          "Rp50.000",
        );
        await expect(page.locator(".chat-batch-entry").nth(1)).toContainText(
          "Rp20.000",
        );
        expect(
          await page
            .getByRole("dialog")
            .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
        ).toBe(true);
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze()
          ).violations,
        ).toEqual([]);
        await page.screenshot({
          path: "test-results/batch-preview-" + width + "-" + theme + ".png",
        });
        await page
          .getByRole("button", { name: "Hapus pengeluaran 2", exact: true })
          .click();
        await expect(page.locator(".chat-batch-overview > .money")).toHaveText(
          "Rp30.000",
        );
        await page
          .getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ })
          .click();
        await expect(
          page.getByRole("dialog", {
            name: "Konfirmasi pengeluaran",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator(".scan-success-hero")).toContainText(
          "1 pengeluaran",
        );
        await expect(page.locator(".scan-success-hero")).toContainText(
          "Rp30.000",
        );
        await expect(page.locator(".chat-batch-source p")).toBeVisible();
        await page.locator(".chat-batch-source summary").click();
        await expect(page.locator(".chat-batch-source p")).toBeHidden();
        await page.locator(".chat-batch-source summary").click();
        await expect(page.locator(".chat-batch-source p")).toBeVisible();
        await expect(page.locator(".chat-batch-source")).toContainText(
          "makan naspad 25k",
        );
        await page
          .getByRole("button", { name: "Catat lagi", exact: true })
          .click();
        await expect(
          page.getByRole("textbox", { name: "Catatan pengeluaran" }),
        ).toHaveValue("");
        await expect(page.getByRole("log")).not.toContainText("kopi 20k");
        expect(mutations).toEqual([]);
        expect(
          await page.evaluate(() =>
            Object.keys(localStorage).filter((key) => key !== "cashly-theme"),
          ),
        ).toEqual([]);
      },
    );
  }

test("Jawaban nominal melengkapi satu catatan; pembelian baru tetap terpisah", async ({
  page,
}) => {
  await openChat(page);
  await send(page, "kopi");
  await expect(page.getByRole("log")).toContainText("Nominalnya berapa");
  await send(page, "12k");
  await expect(
    page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }),
  ).toContainText("Rp12.000");
  await send(page, "roti 8k");
  await preview(page);
  await expect(page.locator(".chat-batch-entry")).toHaveCount(2);
  await expect(page.locator(".chat-batch-overview > .money")).toHaveText(
    "Rp20.000",
  );
});

test("Catatan belum lengkap bisa diperbaiki tanpa menghapus pembelian lainnya", async ({
  page,
}) => {
  await openChat(page);
  await send(page, "makan naspad");
  await send(page, "kopi 20k");
  await preview(page);
  await page.getByRole("button", { name: /^Konfirmasi 2 pengeluaran/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".chat-batch-entry").first()).toContainText(
    "Nominalnya berapa",
  );
  await page
    .getByRole("button", { name: "Ubah pengeluaran 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Catatan pengeluaran" })
    .fill("makan naspad 25k");
  await page
    .getByRole("button", { name: "Terapkan catatan", exact: true })
    .click();
  await expect(page.locator(".chat-batch-entry")).toHaveCount(2);
  await expect(page.locator(".chat-batch-overview > .money")).toHaveText(
    "Rp45.000",
  );
  await page.getByRole("button", { name: /^Konfirmasi 2 pengeluaran/ }).click();
  await expect(page.locator(".scan-success-hero")).toContainText(
    "2 pengeluaran",
  );
});

test("Kategori dan waktu kosong divalidasi, semua catatan dapat dihapus", async ({
  page,
}) => {
  await openChat(page);
  await send(page, "kaos 100k");
  await preview(page);
  await page.getByRole("button", { name: /^Konfirmasi 1 pengeluaran/ }).click();
  await expect(page.locator(".chat-batch-entry")).toContainText(
    "Pilih kategori",
  );
  await page
    .getByRole("button", { name: "Ubah pengeluaran 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Selesai mengubah", exact: true })
    .click();
  await expect(page.getByLabel("Kategori", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page
    .getByLabel("Kategori", { exact: true })
    .selectOption("entertainment");
  await page.getByLabel("Waktu (WIB)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(page.locator(".chat-batch-entry")).toContainText(
    "Tanggal/waktu perlu dilengkapi",
  );
  await page
    .getByRole("button", { name: "Hapus pengeluaran 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^Konfirmasi 0 pengeluaran/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Tambah lewat chat" }).click();
  await expect(page.getByRole("button", { name: /^Tinjau/ })).toHaveCount(0);
});

test("Batal dan Close saat analisis tidak membuka pratinjau terlambat", async ({
  page,
}) => {
  await openChat(page);
  await page.clock.install();
  await send(page, "kopi 12k");
  await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page.clock.runFor(5000);
  await expect(
    page.getByRole("dialog", { name: "Chat manual", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }).click();
  await page.keyboard.press("Escape");
  await page.clock.runFor(5000);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openChat(page, false);
  await expect(
    page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Catatan pengeluaran" }),
  ).toHaveValue("");
});

test("IME, baris baru, contoh dan pesan belum dikirim tidak terlewat saat Tinjau", async ({
  page,
}) => {
  await openChat(page);
  const input = page.getByRole("textbox", { name: "Catatan pengeluaran" });
  await input.fill("kopi 12k");
  await input.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
  });
  await expect(page.getByRole("button", { name: /^Tinjau/ })).toHaveCount(0);
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("kopi 12k\n");
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }),
  ).toBeEnabled();
  await input.fill("roti 8k");
  await expect(
    page.getByRole("button", { name: /^Tinjau 1 pengeluaran/ }),
  ).toBeDisabled();
  await expect(page.getByRole("status")).toContainText(
    "Kirim atau kosongkan pesan",
  );
  await input.fill("");
  await page.getByRole("button", { name: "Lihat contoh catatan" }).click();
  await page
    .locator(".expense-chat-composer")
    .getByRole("button", { name: "Ojek 18k", exact: true })
    .click();
  await expect(input).toHaveValue("Ojek 18k");
});
