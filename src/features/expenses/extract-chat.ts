import { z } from "zod";
import { receiptSchema } from "@/features/scan/receipt-schema";
import { apiRequest } from "@/lib/finance";
import type { ChatEntry } from "./chat-batch";
import type { ChatMessage } from "./chat-session";

const extractedEntry = z.object({
  id: z.string().uuid(), text: z.string().min(1).max(4000), createdAt: z.string().datetime({ offset: true }),
  draft: receiptSchema.nullable(), issue: z.string().nullable(),
  reason: z.enum(["name", "amount", "ambiguous"]).nullable(),
});
const responseSchema = z.object({
  data: z.object({ entries: z.array(extractedEntry).max(50), reply: z.string().min(1).max(1000) }),
});

export async function extractChat(
  message: string, entries: ChatEntry[], history: ChatMessage[],
  signal: AbortSignal, editEntryId?: string,
) {
  const body = {
    message, entries, history: history.slice(-12).map(({ role, text }) => ({ role, text })),
    edit_entry_id: editEntryId ?? null,
  };
  if (new TextEncoder().encode(JSON.stringify(body)).length > 60000)
    throw new Error("Sesi chat terlalu panjang. Tinjau dan simpan daftar ini sebelum mencatat lagi.");
  const response = await apiRequest("chat/extract", "POST", body, undefined, signal);
  const result = responseSchema.safeParse(response);
  if (!result.success) throw new Error("Hasil AI belum bisa dibaca. Coba kirim ulang pesanmu.");
  return result.data.data;
}
