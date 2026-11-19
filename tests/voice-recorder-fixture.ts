import { expect, type Page } from "@playwright/test";

export async function installRecordedAudio(page: Page, audio: Buffer, mimeType = "audio/wav") {
  await page.evaluate(({ base64, mimeType }) => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    class FixtureMediaRecorder {
      static isTypeSupported() { return true; }
      state: RecordingState = "inactive";
      readonly mimeType = mimeType;
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      start() { this.state = "recording"; }
      stop() {
        this.state = "inactive";
        queueMicrotask(() => {
          const data = new Blob([bytes], { type: mimeType });
          this.ondataavailable?.({ data } as BlobEvent);
          this.onstop?.();
        });
      }
    }
    Object.defineProperty(window, "MediaRecorder", { configurable: true, value: FixtureMediaRecorder });
    const getUserMedia = async () => ({ getTracks: () => [], getAudioTracks: () => [] });
    if (navigator.mediaDevices) {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", { configurable: true, value: getUserMedia });
    } else {
      Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    }
  }, { base64: audio.toString("base64"), mimeType });
}

export async function startRecording(page: Page) {
  await page.getByRole("button", { name: "Mulai rekam", exact: true }).click();
  await expect(page.getByRole("button", { name: "Hentikan rekaman", exact: true })).toBeEnabled();
}

export async function stopRecording(page: Page) {
  await page.getByRole("button", { name: "Hentikan rekaman", exact: true }).click();
}
