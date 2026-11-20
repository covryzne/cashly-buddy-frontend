import { z } from "zod";

export const whatsappChallengeSchema = z.object({
  id: z.string().uuid(),
  state: z.enum(["awaiting_message", "otp_sent", "verified", "cancelled", "expired", "locked"]),
  expires_at: z.string().datetime({ offset: true }),
  resend_at: z.string().datetime({ offset: true }),
  attempts_remaining: z.number().int().min(0).max(5),
  chat_url: z.string().url().refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "wa.me" && !url.username && !url.password;
  }),
  masked_number: z.string().nullable(),
});
export const whatsappConnectionSchema = z.object({
  status: z.enum(["connected", "not_linked"]),
  masked_number: z.string().nullable().optional(),
  connected_at: z.string().nullable().optional(),
  challenge: whatsappChallengeSchema.nullable().optional(),
  recording_available: z.boolean(),
});
export type WhatsappChallenge = z.infer<typeof whatsappChallengeSchema>;
export type WhatsappConnection = z.infer<typeof whatsappConnectionSchema>;

export async function whatsappRequest(path: string, method = "GET", body?: unknown, key?: string) {
  if (!navigator.onLine) throw new Error("Hubungkan internet untuk mengelola koneksi WhatsApp.");
  const response = await fetch(`/api/cashly/me/whatsapp${path}`, {
    method, cache: "no-store", signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/json", ...(method === "POST" ? { "Idempotency-Key": key ?? crypto.randomUUID() } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error?.message === "string" ? result.error.message : "Koneksi WhatsApp belum dapat diperbarui.");
  return result.data;
}
