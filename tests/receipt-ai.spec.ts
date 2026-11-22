import { test, expect } from "@playwright/test";
import sharp from "sharp";

test.use({ reducedMotion: "reduce" });
const origin = "http://127.0.0.1:34568";

test.beforeEach(async ({ page, request }) => {
  await request.get(`${origin}/__test/otp?enabled=false`);
  await request.get(`${origin}/__test/chat`);
  await request.post("/auth/email/register", {
    headers: { Origin: "http://127.0.0.1:34567" },
    data: { name: "OCR Tester", email: "ocr@example.invalid", password: "Local-Test123!", confirmPassword: "Local-Test123!" },
  });
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("ocr@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("button", { name: /Scan struk otomatis/ }).click();
  await expect(page.getByRole("button", { name: "Pilih dari galeri" })).toBeVisible();
});

async function upload(page: import("@playwright/test").Page) {
  const buffer = await sharp({ create: { width: 200, height: 300, channels: 3, background: "white" } }).png().toBuffer();
  await page.getByLabel("Pilih foto struk", { exact: true }).setInputFiles({ name: "nota.png", mimeType: "image/png", buffer });
  await expect(page.getByRole("textbox", { name: "Keterangan foto (opsional)" })).toBeVisible();
}

test("gallery caption reaches API; edit preview then explicitly save receipt source", async ({ page, request }, testInfo) => {
  await upload(page);
  await page.screenshot({ path: testInfo.outputPath("photo.png") });
  expect((await (await request.get(`${origin}/__test/chat-state`)).json()).extractions).toBe(0);
  await page.getByRole("textbox", { name: "Keterangan foto (opsional)" }).fill("Makan siang nasi padang, QRIS");
  const sent = page.waitForRequest(req => req.url().endsWith("/api/cashly/receipts/extract"));
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  expect((await sent).postDataJSON().caption).toContain("Makan siang");
  await expect(page.getByRole("dialog", { name: "Review struk", exact: true })).toBeVisible();
  await expect(page.locator("#scan-merchant")).toHaveValue("Nasi Padang");
  await page.screenshot({ path: testInfo.outputPath("preview.png") });
  await page.locator("#scan-merchant").fill("Makan Siang Nasi Padang");
  expect((await (await request.get(`${origin}/__test/chat-state`)).json()).commits).toBe(0);
  await page.getByRole("button", { name: /Simpan pengeluaran/ }).click();
  await expect(page.getByRole("dialog", { name: "Konfirmasi pengeluaran", exact: true })).toBeVisible();
  const state = await (await request.get(`${origin}/__test/chat-state`)).json();
  expect(state.commits).toBe(1);
  expect(state.saved[0]).toMatchObject({ source: "receipt", amount_idr: "12000", merchant: "Makan Siang Nasi Padang" });
});

test("failure preserves photo and caption; clarification can be completed and retried", async ({ page, request }) => {
  await upload(page);
  await page.getByRole("textbox", { name: "Keterangan foto (opsional)" }).fill("buram");
  await request.get(`${origin}/__test/chat?fail=true`);
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  await expect(page.locator(".scan-flow").getByRole("alert")).toContainText("AI belum tersedia");
  await expect(page.getByRole("textbox", { name: "Keterangan foto (opsional)" })).toHaveValue("buram");
  await expect(page.getByAltText("Foto pengeluaran yang akan dianalisis")).toBeVisible();
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  await expect(page.locator(".scan-flow").getByRole("status")).toContainText("Berapa total yang tertulis?");
  await page.getByRole("textbox", { name: "Keterangan foto (opsional)" }).fill("Nasi padang 12rb qris");
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Review struk", exact: true })).toBeVisible();
  expect((await (await request.get(`${origin}/__test/chat-state`)).json()).commits).toBe(0);
});

test("close during analysis ignores late response; example cannot write a real expense", async ({ page, request }) => {
  await upload(page);
  await request.get(`${origin}/__test/chat?slow=true`);
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  await expect(page.locator(".scan-flow").getByRole("status")).toContainText("Mochi sedang membaca foto");
  await page.getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("button", { name: /Scan struk otomatis/ }).click();
  await page.getByRole("button", { name: "Coba struk contoh" }).click();
  await expect(page.getByRole("button", { name: /Simpan pengeluaran/ })).toBeDisabled();
  expect((await (await request.get(`${origin}/__test/chat-state`)).json()).commits).toBe(0);
});

test("invalid gallery file does not call extraction", async ({ page, request }) => {
  await page.getByLabel("Pilih foto struk", { exact: true }).setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("broken") });
  await expect(page.locator(".scan-flow").getByRole("alert")).toContainText("Foto tidak bisa dibaca");
  expect((await (await request.get(`${origin}/__test/chat-state`)).json()).extractions).toBe(0);
});

test("disconnect and reconnect preserve the selected photo and caption", async ({ page, context }) => {
  await upload(page);
  await page.getByRole("textbox", { name: "Keterangan foto (opsional)" }).fill("Servis motor, bayar QRIS");
  await context.setOffline(true);
  await expect(page.getByRole("dialog", { name: "Perlu koneksi internet" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("textbox", { name: "Keterangan foto (opsional)" })).toHaveValue("Servis motor, bayar QRIS");
  await expect(page.getByAltText("Foto pengeluaran yang akan dianalisis")).toBeVisible();
});

test("camera capture sends a JPEG and stops the camera before analysis", async ({ page }) => {
  // Exercise the actual video -> canvas -> JPEG path with a deterministic video stream.
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 480; canvas.height = 640;
    const draw = () => {
      const context = canvas.getContext("2d")!;
      context.fillStyle = "white"; context.fillRect(0, 0, 480, 640);
      context.fillStyle = "black"; context.font = "24px sans-serif";
      context.fillText("TOTAL 12000", 80, 200);
    };
    draw();
    const stream = canvas.captureStream(10);
    const timer = window.setInterval(draw, 100);
    stream.getVideoTracks()[0].addEventListener("ended", () => clearInterval(timer));
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: async () => stream });
    (window as unknown as { __ocrStream: MediaStream }).__ocrStream = stream;
  });
  await page.getByRole("button", { name: "Izinkan kamera", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ambil foto struk" })).toBeEnabled();
  await page.getByRole("button", { name: "Ambil foto struk" }).click();
  await expect(page.getByRole("textbox", { name: "Keterangan foto (opsional)" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __ocrStream: MediaStream }).__ocrStream.getTracks()[0].readyState)).toBe("ended");
  const sent = page.waitForRequest(req => req.url().endsWith("/api/cashly/receipts/extract"));
  await page.getByRole("button", { name: "Analisis foto", exact: true }).click();
  expect((await sent).postDataJSON().image.mime_type).toBe("image/jpeg");
  await expect(page.getByRole("dialog", { name: "Review struk", exact: true })).toBeVisible();
});
