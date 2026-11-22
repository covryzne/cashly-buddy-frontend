import { z } from "zod";
import type { ActivityExpense } from "@/mocks/fixtures/activity";
import { receiptSchema } from "@/features/scan/receipt-schema";
import { homeFixture } from "@/mocks/fixtures/home";

export const SNAPSHOT_DB = "cashly-demo-offline-v1";
const snapshotSchema = z.object({
  version: z.literal(1),
  owner: z.literal("fictional-demo"),
  updatedAt: z.string().datetime(),
  expenses: z.array(z.object({
    id: z.string().min(1),
    merchant: z.string(),
    description: z.string(),
    categoryCode: z.string().refine(code => homeFixture.categories.some(c => c.code === code)),
    amountIdr: z.string().regex(/^[1-9]\d{0,14}$/),
    occurredAt: z.string().datetime({ offset: true }),
    paymentMethod: z.string(),
    source: z.enum(["receipt", "voice", "chat", "dashboard"]),
    tags: z.array(z.string()),
    draft: receiptSchema.optional(),
  })).max(2000).refine(expenses => new Set(expenses.map(expense => expense.id)).size === expenses.length),
});
export type LocalSnapshot = z.infer<typeof snapshotSchema>;

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(SNAPSHOT_DB, 1);
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      reject(new Error("Penyimpanan tidak merespons."));
    }, 4000);
    request.onupgradeneeded = () => request.result.createObjectStore("snapshots");
    request.onerror = () => { settled = true; clearTimeout(timeout); reject(request.error); };
    request.onblocked = () => { settled = true; clearTimeout(timeout); reject(new Error("Penyimpanan sedang digunakan tab lain.")); };
    request.onsuccess = () => {
      clearTimeout(timeout);
      if (settled) { request.result.close(); return; }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

// Serialize writes and logout deletion, including changes made just before logout.
let queue: Promise<unknown> = Promise.resolve();
function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const work = queue.catch(() => undefined).then(async () => {
    const db = await database();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction("snapshots", mode);
      const request = action(tx.objectStore("snapshots"));
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error ?? new Error("Penyimpanan gagal.")); };
    });
  });
  queue = work;
  return work;
}

export async function readSnapshot(): Promise<LocalSnapshot | null> {
  const stored = await transaction("readonly", store => store.get("fictional-demo"));
  if (stored === undefined) return null;
  const parsed = snapshotSchema.safeParse(stored);
  if (!parsed.success) {
    await clearSnapshot();
    return null;
  }
  return parsed.data;
}
export async function writeSnapshot(expenses: ActivityExpense[], updatedAt: string) {
  const snapshot = snapshotSchema.parse({ version: 1, owner: "fictional-demo", expenses, updatedAt });
  return transaction("readwrite", store => store.put(snapshot, "fictional-demo"));
}
export function clearSnapshot() {
  return transaction("readwrite", store => store.clear());
}
