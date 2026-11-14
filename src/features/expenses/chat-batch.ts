import { formatMoney } from "@/lib/format/money";
import {
  receiptAmounts,
  type ReceiptDraft,
} from "@/features/scan/receipt-schema";
import { parseExpenseText } from "./parse-expense-text";
import type { ChatMessage } from "./chat-session";

export type ChatEntry = {
  id: string;
  text: string;
  createdAt: string;
  draft: ReceiptDraft | null;
  issue: string | null;
  reason: "name" | "amount" | "ambiguous" | null;
};
export type BatchStep =
  "chat" | "processing" | "review" | "detail" | "source" | "success";
export type ConfirmedChatBatch = {
  entries: ChatEntry[];
  messages: ChatMessage[];
  confirmedAt: string;
};
export type ChatBatchSnapshot = {
  step: Exclude<BatchStep, "processing">;
  input: string;
  messages: ChatMessage[];
  entries: ChatEntry[];
  activeId: string | null;
  sourceInput: string;
  confirmed: ConfirmedChatBatch | null;
};

export function batchTotal(entries: ChatEntry[]) {
  return entries.reduce((sum, entry) => {
    const amount = entry.draft ? receiptAmounts(entry.draft).total : BigInt(0);
    return sum + (amount > BigInt(0) ? amount : BigInt(0));
  }, BigInt(0));
}

export function entryTitle(entry: ChatEntry) {
  return (
    entry.draft?.merchant ||
    entry.draft?.items.map((item) => item.name).join(", ") ||
    entry.text
  );
}

export function collectChatEntry(
  entries: ChatEntry[],
  raw: string,
  id: string,
  createdAt: string,
) {
  let text = raw.trim();
  let result = parseExpenseText(text);
  let target: ChatEntry | undefined;
  if (result.kind === "clarify" && result.reason !== "ambiguous") {
    const reason = result.reason;
    target = entries.findLast(
      (entry) =>
        !entry.draft &&
        ((entry.reason === "amount" && reason === "name") ||
          (entry.reason === "name" && reason === "amount")),
    );
    if (target) {
      const combined =
        target.reason === "amount"
          ? `${target.text} ${text}`
          : `${text} ${target.text}`;
      const combinedResult = parseExpenseText(combined);
      if (combinedResult.kind === "ready") {
        text = combined;
        result = combinedResult;
      } else target = undefined;
    }
  }
  const entry: ChatEntry = {
    id: target?.id ?? id,
    text,
    createdAt: target?.createdAt ?? createdAt,
    draft: result.kind === "ready" ? result.draft : null,
    issue: result.kind === "clarify" ? result.message : null,
    reason: result.kind === "clarify" ? result.reason : null,
  };
  const next = target
    ? entries.map((old) => (old.id === target.id ? entry : old))
    : [...entries, entry];
  const total = batchTotal(next);
  const incomplete = next.filter((item) => !item.draft).length;
  const reply =
    result.kind === "ready"
      ? `Siap, ${entry.draft!.items.map((item) => item.name).join(", ")} ${formatMoney(receiptAmounts(entry.draft!).total.toString())} masuk daftar untuk ditinjau. Ada ${next.length} pengeluaran, total ${formatMoney(total.toString())}.${incomplete ? ` ${incomplete} catatan masih perlu dilengkapi.` : ""}`
      : result.message;
  return { entries: next, reply };
}
