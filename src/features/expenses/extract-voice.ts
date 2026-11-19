import { z } from "zod";
import { apiRequest } from "@/lib/finance";
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
  const response = await apiRequest("voice/transcribe", "POST", {
    audio: { mime_type: blob.type, data },
  }, undefined, signal);
  const result = transcriptSchema.safeParse(response);
  if (!result.success) throw new Error("Transkrip AI belum bisa dibaca. Rekamanmu tetap tersedia untuk dicoba lagi.");
  return result.data.data;
}

export async function extractVoice(message: string, signal: AbortSignal) {
  const response = await apiRequest("voice/extract", "POST", { message }, undefined, signal);
  const result = extractionResponseSchema.safeParse(response);
  if (!result.success) throw new Error("Draft AI belum bisa dibaca. Periksa transkrip lalu coba lagi.");
  return result.data.data;
}
