import { z } from "zod";
import { receiptSchema } from "@/features/scan/receipt-schema";
import { requestExtraction } from "@/lib/extraction-request";
import type { ChatEntry } from "./chat-batch";
import type { ChatMessage } from "./chat-session";

const extractedEntry = z.object({
  id: z.string().uuid(), text: z.string().min(1).max(4000), createdAt: z.string().datetime({ offset: true }),
  draft: receiptSchema.nullable(), issue: z.string().nullable(),
  reason: z.enum(["name", "amount", "ambiguous"]).nullable(),
});
export const extractionResponseSchema = z.object({
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
  return requestExtraction("chat/extract", body, signal, response => {
    const result = extractionResponseSchema.safeParse(response);
    return result.success ? result.data.data : undefined;
  });
}
