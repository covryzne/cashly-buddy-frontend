import { apiRequest, ApiRequestError } from "@/lib/finance";

const chatUnavailable = "Mochi belum bisa memproses pesanmu. Tunggu sebentar, lalu coba kirim lagi, ya.";
const voiceUnavailable = "Mochi belum bisa memproses catatan suaramu. Coba lagi sebentar, ya.";
const messages = {
  "chat/extract": chatUnavailable,
  "voice/transcribe": voiceUnavailable,
  "voice/extract": voiceUnavailable,
  "receipts/extract": "Mochi belum bisa membaca strukmu. Coba lagi sebentar, ya.",
};
type ExtractionPath = keyof typeof messages;

export async function requestExtraction<T>(
  path: ExtractionPath, body: unknown, signal: AbortSignal,
  parse: (response: unknown) => T | undefined,
): Promise<T> {
  let response: unknown;
  try {
    response = await apiRequest(path, "POST", body, undefined, signal);
  } catch (error) {
    if (signal.aborted && !(error instanceof Error && error.name === "TimeoutError")) throw error;
    if (
      (error instanceof ApiRequestError && (error.status >= 500 || error.code === "AI_RATE_LIMITED")) ||
      error instanceof TypeError ||
      error instanceof SyntaxError ||
      (error instanceof Error && error.name === "TimeoutError")
    ) throw new Error(messages[path]);
    throw error;
  }
  const result = parse(response);
  if (result === undefined) throw new Error(messages[path]);
  return result;
}
