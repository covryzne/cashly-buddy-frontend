import { z } from "zod";
import { apiExpensesSchema } from "@/lib/auth/types";
import type { ActivityExpense } from "@/mocks/fixtures/activity";
import { receiptAmounts, type ReceiptDraft } from "@/features/scan/receipt-schema";
import { dateKey } from "@/lib/format/period";
import { formatDate, wibDateTime } from "@/lib/format/datetime";

export const gameSchema = z.object({
  hero_level: z.number().min(1).max(5), current_streak: z.number(), longest_streak: z.number(),
  protection_remaining: z.number(), protection_month: z.string(),
  streak_status: z.enum(["active","needs_recovery","broken"]), today_checked_in: z.boolean(),
  today_local_date: z.string().optional(), timezone:z.string().optional(),
  recovery: z.object({ protected_local_dates: z.array(z.string()), required:z.number(), can_restore:z.boolean(), streak_after_recovery:z.number() }).nullable(),
  calendar: z.array(z.object({ date: z.string(), status: z.string() })),
  missions: z.array(z.object({ code: z.string(), title: z.string(), completed: z.boolean(), can_complete:z.boolean().default(false), available_from:z.string().nullable().optional(), test_override:z.boolean().default(false) })),
});
export type GameOverview = z.infer<typeof gameSchema>;
export const paymentLabels: Record<string, string> = {
  qris: "QRIS", cash: "Tunai", bank_transfer: "Transfer bank", debit_card: "Kartu debit",
  credit_card: "Kartu kredit", e_wallet: "Dompet digital", unknown: "Lainnya",
};

export function mapExpense(row: z.infer<typeof apiExpensesSchema>["data"][number]): ActivityExpense {
  return {
    id: row.id, merchant: row.merchant, description: row.description,
    categoryCode: row.category_code, amountIdr: row.amount_idr, occurredAt: row.occurred_at,
    paymentMethod: paymentLabels[row.payment_method] ?? "Lainnya", version: row.version,
    source: row.source === "receipt" ? "receipt" : row.source === "voice" ? "voice" :
      row.source === "dashboard" ? "dashboard" : "chat", tags: [],
    draft: { merchant: row.merchant, categoryCode: row.category_code,
      paymentMethod: paymentLabels[row.payment_method] ?? "Lainnya",
      occurredDate: dateKey(row.occurred_at),
      occurredTime: formatDate(row.occurred_at, {hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).replace(".", ":"),
      discountIdr: row.discount_idr, taxIdr: row.tax_idr,
      items: row.items.length ? row.items.map(item => ({ id: `item-${item.item_index}`,
        name: item.label, quantity: String(item.quantity), priceIdr: item.unit_price_idr })) :
        [{ id: "simple", name: row.description, quantity: "1", priceIdr: row.amount_idr }],
    },
  };
}

export function expensePayload(draft: ReceiptDraft, version?: number) {
  const payment = Object.entries(paymentLabels).find(([,label])=>label===draft.paymentMethod)?.[0] ?? "unknown";
  return { merchant: draft.merchant, description: draft.items.map(i=>i.name).join(", ").slice(0,500),
    category_code: draft.categoryCode, occurred_at: wibDateTime(draft.occurredDate,draft.occurredTime),
    payment_method: payment, amount_idr: receiptAmounts(draft).total.toString(),
    discount_idr: draft.discountIdr, tax_idr: draft.taxIdr, version,
    items: draft.items.map(i=>({label:i.name,quantity:Number(i.quantity),unit_price_idr:i.priceIdr})),
  };
}

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
  }
}

export async function apiRequest(path: string, method="GET", body?: unknown, key?: string, signal?: AbortSignal) {
  if (typeof window !== "undefined" && (!navigator.onLine || document.documentElement.dataset.cashlyOffline === "true"))
    throw new Error("Kamu sedang offline. Hubungkan internet untuk memperbarui data.");
  const timeout = AbortSignal.timeout(["chat/extract", "receipts/extract", "voice/transcribe", "voice/extract"].includes(path) ? 80000 : path.startsWith("me/security/") ? 50000 : 20000);
  const response = await fetch(`/api/cashly/${path}`, {method, cache:"no-store",
    headers: {"Content-Type":"application/json", ...(method!=="GET" ? {"Idempotency-Key":key ?? crypto.randomUUID()} : {})},
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const result = await response.json();
  if (!response.ok) throw new ApiRequestError(
    typeof result.error?.message === "string" ? result.error.message :
      "Permintaan belum berhasil. Coba lagi atau muat ulang data.",
    response.status,
    typeof result.error?.code === "string" ? result.error.code : undefined,
  );
  return result;
}
