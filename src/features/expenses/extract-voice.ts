import { z } from "zod";
import { requestExtraction } from "@/lib/extraction-request";
import { extractionResponseSchema } from "./extract-chat";
import { MAX_VOICE_DECODED_SECONDS, MAX_VOICE_SECONDS } from "./voice-limits";

const transcriptSchema = z.object({ data: z.object({
  transcript: z.string().max(4000), status: z.enum(["clear", "unclear"]),
  issue: z.string().nullable(), duration_seconds: z.number().min(0.25).max(MAX_VOICE_DECODED_SECONDS),
}) });

export async function transcribeVoice(blob: Blob, signal: AbortSignal, duration: number) {
  if (duration > MAX_VOICE_DECODED_SECONDS) {
    throw new Error(`Rekaman melebihi ${MAX_VOICE_SECONDS / 60} menit. Rekam ulang dengan durasi lebih singkat.`);
  }
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Rekaman belum bisa dibaca."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(blob);
  });
  signal.throwIfAborted();
  return requestExtraction("voice/transcribe", { audio: { mime_type: blob.type, data } }, signal, response => {
    const result = transcriptSchema.safeParse(response);
    return result.success ? result.data.data : undefined;
  });
}

export async function extractVoice(message: string, signal: AbortSignal) {
  return requestExtraction("voice/extract", { message }, signal, response => {
    const result = extractionResponseSchema.safeParse(response);
    return result.success ? result.data.data : undefined;
  });
}
