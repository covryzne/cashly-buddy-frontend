import { test, expect, type Page } from "@playwright/test";
import { installRecordedAudio, startRecording, stopRecording } from "./voice-recorder-fixture";

test.use({ reducedMotion: "reduce" });
const upstream = "http://127.0.0.1:34568";
function wav(seconds = 1) {
  const size = seconds * 16000 * 2;
  const buffer = Buffer.alloc(44 + size);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(36 + size, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24); buffer.writeUInt32LE(32000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(size, 40);
  for (let index = 0; index < size / 2; index++) buffer.writeInt16LE(Math.round(4000 * Math.sin(2 * Math.PI * 440 * index / 16000)), 44 + index * 2);
  return buffer;
}
async function record(page: Page) {
  await installRecordedAudio(page, wav());
  await startRecording(page);
  await stopRecording(page);
}
async function expectTranscript(page: Page) {
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).toBeVisible();
}
test.beforeEach(async ({ page, request }) => {
  await request.get(`${upstream}/__test/otp?enabled=false`);
  await request.get(`${upstream}/__test/chat`);
  await request.post("/auth/email/register", { headers: { Origin: "http://127.0.0.1:34567" }, data: {
    name: "VN Tester", email: "vn@example.invalid", password: "Local-Test123!", confirmPassword: "Local-Test123!",
  } });
  await page.goto("/login");
  await page.locator(".login-form:visible").getByLabel("Email", { exact: true }).fill("vn@example.invalid");
  await page.locator(".login-form:visible").getByLabel("Kata sandi", { exact: true }).fill("Local-Test123!");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page).toHaveURL(/\/beranda/);
  await page.locator(".expense-summary").getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByRole("button", { name: /Voice note kilat/ }).click();
  await expect(page.getByRole("button", { name: "Mulai rekam", exact: true })).toBeVisible();
});

test("record, automatic transcription, correction, editable preview and explicit voice save", async ({ page, request }, testInfo) => {
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).transcriptions).toBe(0);
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await record(page); await expectTranscript(page);
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).toHaveValue("Hari ini beli nasi padang dua belas ribu bayar qris");
  await page.getByRole("textbox", { name: "Transkrip voice note" }).fill("Hari ini beli nasi padang 15rb qris");
  await page.screenshot({ path: testInfo.outputPath("voice-transcript.png") });
  const sent = page.waitForRequest(request => request.url().endsWith("/voice/extract"));
  await page.getByRole("button", { name: "Tinjau pengeluaran", exact: true }).click();
  expect((await sent).postDataJSON().message).toContain("15rb");
  await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).commits).toBe(0);
  await page.getByRole("button", { name: "Ubah pengeluaran 1" }).click();
  await page.locator("#scan-merchant").fill("Makan Siang Nasi Padang");
  await page.getByRole("button", { name: "Selesai mengubah" }).click();
  await page.getByRole("button", { name: /Simpan 1 pengeluaran/ }).click();
  await expect(page.getByText("Pengeluaran berhasil disimpan.", { exact: true })).toBeVisible();
  const state = await (await request.get(`${upstream}/__test/chat-state`)).json();
  expect(state.commits).toBe(1);
  expect(state.saved[0]).toMatchObject({ source: "voice", amount_idr: "15000", merchant: "Makan Siang Nasi Padang" });
});

test("unclear audio does not invent a transcript and can be corrected manually", async ({ page, request }) => {
  await request.get(`${upstream}/__test/chat?unclear=true`);
  await record(page); await expectTranscript(page);
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).toHaveValue("");
  await expect(page.locator(".voice-source-editor").getByRole("status")).toContainText("Suara belum jelas");
  await expect(page.getByRole("button", { name: "Tinjau pengeluaran", exact: true })).toBeDisabled();
  await page.getByRole("textbox", { name: "Transkrip voice note" }).fill("Nasi padang 12rb qris");
  await page.getByRole("button", { name: "Tinjau pengeluaran", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).commits).toBe(0);
});

test("timeout and invalid result preserve the recorded audio for retry", async ({ page, request }) => {
  await request.get(`${upstream}/__test/chat?fail=true`);
  await record(page);
  await expect(page.locator(".voice-flow").getByRole("alert")).toContainText("AI belum merespons");
  await expect(page.getByRole("button", { name: "Coba transkripsi lagi" })).toBeVisible();
  await request.get(`${upstream}/__test/chat?invalid=true`);
  await page.getByRole("button", { name: "Coba transkripsi lagi" }).click();
  await expect(page.locator(".voice-flow").getByRole("alert")).toContainText("Transkrip AI belum bisa dibaca");
  await page.getByRole("button", { name: "Coba transkripsi lagi" }).click();
  await expectTranscript(page);
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).not.toBeEmpty();
});

test("disconnect preserves audio and transcript in the open dialog; reconnect resumes", async ({ page, context }) => {
  await record(page); await expectTranscript(page);
  await page.getByRole("textbox", { name: "Transkrip voice note" }).fill("Transkrip yang sudah dikoreksi 15rb qris");
  await context.setOffline(true);
  await expect(page.getByRole("dialog", { name: "Perlu koneksi internet" })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).toHaveValue("Transkrip yang sudah dikoreksi 15rb qris");
  await page.getByRole("button", { name: "Kembali", exact: true }).click();
  await expect(page.getByRole("button", { name: "Coba transkripsi lagi" })).toBeVisible();
});

test("cancel keeps audio, ignores late response, and never saves", async ({ page, request }) => {
  await request.get(`${upstream}/__test/chat?slow=true`);
  const sent = page.waitForRequest(request => request.url().endsWith("/voice/transcribe"));
  await record(page);
  await sent;
  await expect(page.getByText("Mochi sedang menganalisis rekaman", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Coba transkripsi lagi" })).toBeVisible();
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).commits).toBe(0);
});

test("an uncertain save retries the same voice record without another commit", async ({ page, request }) => {
  await request.get(`${upstream}/__test/chat?saveFailOnce=true`);
  await record(page); await expectTranscript(page);
  await page.getByRole("button", { name: "Tinjau pengeluaran", exact: true }).click();
  await page.getByRole("button", { name: /Simpan 1 pengeluaran/ }).click();
  await expect(page.getByRole("dialog", { name: "Permintaan belum selesai" })).toBeVisible();
  await page.getByRole("dialog", { name: "Permintaan belum selesai" }).getByRole("button", { name: "Tutup dialog", exact: true }).click();
  await page.getByRole("button", { name: /Simpan 1 pengeluaran/ }).click();
  await expect(page.getByText("Pengeluaran berhasil disimpan.", { exact: true })).toBeVisible();
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).commits).toBe(1);
});

test("recording past one minute keeps running and Stop transcribes it once", async ({ page, request }) => {
  await installRecordedAudio(page, wav(61));
  await page.clock.install();
  await startRecording(page);
  await page.clock.fastForward(61000);
  await expect(page.locator(".voice-timer")).toHaveAttribute("aria-label", "61 detik");
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).transcriptions).toBe(0);
  await stopRecording(page);
  await expectTranscript(page);
  expect((await (await request.get(`${upstream}/__test/chat-state`)).json()).transcriptions).toBe(1);
});

test("invalid extraction preserves the corrected transcript and can be retried", async ({ page, request }) => {
  await record(page); await expectTranscript(page);
  await page.getByRole("textbox", { name: "Transkrip voice note" }).fill("Nasi padang 15rb qris");
  await request.get(`${upstream}/__test/chat?invalid=true`);
  await page.getByRole("button", { name: "Tinjau pengeluaran", exact: true }).click();
  await expect(page.locator(".voice-flow").getByRole("alert")).toContainText("Draft AI belum bisa dibaca");
  await expect(page.getByRole("textbox", { name: "Transkrip voice note" })).toHaveValue("Nasi padang 15rb qris");
  await page.getByRole("button", { name: "Tinjau pengeluaran", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Pratinjau pengeluaran", exact: true })).toBeVisible();
});

test("MediaRecorder path releases microphone and creates a transcribable blob", async ({ page }) => {
  const nativeRecorder = await page.evaluate(() => typeof MediaRecorder !== "undefined");
  test.skip(!nativeRecorder, "This WebKit runtime does not provide MediaRecorder; fixture recordings are tested separately.");
  await page.evaluate(() => {
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    const oscillator = context.createOscillator(); oscillator.frequency.value = 440;
    oscillator.connect(destination); oscillator.start();
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: async () => { await context.resume(); return destination.stream; } });
    (window as unknown as { __voiceTest: { context: AudioContext; stream: MediaStream } }).__voiceTest = { context, stream: destination.stream };
  });
  await page.getByRole("button", { name: "Mulai rekam", exact: true }).click();
  await expect(page.locator(".voice-status")).toHaveText("Sedang merekam");
  await expect(page.locator(".voice-timer")).toHaveAttribute("aria-label", "1 detik");
  await page.getByRole("button", { name: "Hentikan rekaman", exact: true }).click();
  await expectTranscript(page);
  expect(await page.evaluate(async () => {
    const capture = (window as unknown as { __voiceTest: { context: AudioContext; stream: MediaStream } }).__voiceTest;
    const released = capture.stream.getTracks().every(track => track.readyState === "ended");
    await capture.context.close(); return released;
  })).toBe(true);
  await expectTranscript(page);
});
