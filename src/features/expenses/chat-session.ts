import type { ReceiptDraft } from "@/features/scan/receipt-schema";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt: string | null;
};
export type ChatStep =
  "chat" | "processing" | "review" | "success" | "transcript";
export type ConfirmedChatNote = {
  draft: ReceiptDraft;
  source: "chat" | "voice";
  text: string;
  confirmedAt: string;
  messages: ChatMessage[];
};
export type ChatSessionSnapshot = {
  step: Exclude<ChatStep, "processing">;
  input: string;
  sourceText: string;
  messages: ChatMessage[];
  draft: ReceiptDraft;
  confirmed: ConfirmedChatNote | null;
  missing: { text: string; reason: "name" | "amount" } | null;
};

export function welcomeMessage(
  text = "Hai! Ceritakan pengeluaranmu. Cukup nama pembelian dan nominalnya, ya.",
): ChatMessage {
  // Introductory copy has no send time until the conversation begins.
  return { id: 0, role: "assistant", text, createdAt: null };
}

export function appendChatMessage(
  messages: ChatMessage[],
  message: ChatMessage,
) {
  return [
    ...messages.map((entry) =>
      entry.createdAt ? entry : { ...entry, createdAt: message.createdAt },
    ),
    message,
  ];
}
