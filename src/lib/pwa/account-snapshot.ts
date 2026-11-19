import { z } from "zod";
import { accountSchema, type AuthAccount } from "@/lib/auth/types";
import { gameSchema, type GameOverview } from "@/lib/finance";
import type { ActivityExpense } from "@/mocks/fixtures/activity";
import { receiptSchema } from "@/features/scan/receipt-schema";

export const ACCOUNT_SNAPSHOT_DB = "cashly-account-offline-v1";
const ACTIVE_KEY = "cashly-offline-active";
const CHANNEL = "cashly-offline";
type Lease = { accountId: string; epoch: string };
const leaseSchema = z.object({ accountId: z.string().uuid(), epoch: z.string().uuid() });
const expenseSchema = z.object({
  id: z.string().uuid(), merchant: z.string(), description: z.string(),
  categoryCode: z.string(), amountIdr: z.string().regex(/^[1-9]\d{0,11}$/),
  occurredAt: z.string().datetime({ offset: true }), paymentMethod: z.string(),
  source: z.enum(["receipt", "voice", "chat", "dashboard"]), tags: z.array(z.string()),
  version: z.number().int().positive(), draft: receiptSchema,
});
const schema = z.object({
  version: z.literal(1), account: accountSchema, updatedAt: z.string().datetime(),
  expenses: z.array(expenseSchema).refine(rows => new Set(rows.map(row => row.id)).size === rows.length),
  game: gameSchema.nullable(), gameUpdatedAt: z.string().datetime().nullable(),
  hasMore: z.boolean(),
});
export type AccountSnapshot = z.infer<typeof schema>;
let queue: Promise<unknown> = Promise.resolve();

function marker(): Lease | null {
  const raw = localStorage.getItem(ACTIVE_KEY);
  if (!raw) return null;
  try { return leaseSchema.parse(JSON.parse(raw)); } catch { return null; }
}
function same(a: Lease | null | undefined, b: Lease | null | undefined) {
  return Boolean(a && b && a.accountId === b.accountId && a.epoch === b.epoch);
}
function notify() {
  window.dispatchEvent(new Event("cashly-offline-changed"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("changed"); channel.close();
  }
}
export function subscribeSnapshotIdentity(listener: () => void) {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  if (channel) channel.onmessage = listener;
  const storage = (event: StorageEvent) => { if (event.key === ACTIVE_KEY) listener(); };
  window.addEventListener("storage", storage);
  window.addEventListener("cashly-offline-changed", listener);
  return () => {
    channel?.close(); window.removeEventListener("storage", storage);
    window.removeEventListener("cashly-offline-changed", listener);
  };
}

function transaction<T>(work: (store: IDBObjectStore, resolve: (value: T) => void) => void): Promise<T> {
  const pending = queue.catch(() => undefined).then(() => new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(ACCOUNT_SNAPSHOT_DB, 1);
    let settled = false;
    let db: IDBDatabase | undefined;
    let tx: IDBTransaction | undefined;
    const timeout = window.setTimeout(() => {
      settled = true; try { tx?.abort(); } catch { /* already completed */ }
      db?.close(); reject(new Error("Penyimpanan offline tidak merespons."));
    }, 6000);
    const fail = () => {
      clearTimeout(timeout); db?.close();
      if (!settled) { settled = true; reject(new Error("Salinan offline belum dapat disimpan.")); }
    };
    open.onupgradeneeded = () => open.result.createObjectStore("snapshots");
    open.onerror = open.onblocked = fail;
    open.onsuccess = () => {
      db = open.result;
      if (settled) { db.close(); return; }
      db.onversionchange = () => db?.close();
      tx = db.transaction("snapshots", "readwrite");
      let result: T;
      tx.oncomplete = () => {
        clearTimeout(timeout); db?.close();
        if (!settled) { settled = true; resolve(result); }
      };
      tx.onerror = tx.onabort = fail;
      try { work(tx.objectStore("snapshots"), value => { result = value; }); }
      catch { tx.abort(); }
    };
  }));
  queue = pending;
  return pending;
}

// Call only with an account returned by the authenticated server layout.
export async function activateAccountSnapshot(accountId: string): Promise<Lease> {
  const previous = marker();
  const lease = previous?.accountId === accountId ? previous : { accountId, epoch: crypto.randomUUID() };
  const validated = leaseSchema.parse(lease);
  await transaction<void>((store, done) => {
    const request = store.get("active");
    request.onsuccess = () => {
      if (!same(request.result, validated)) store.clear();
      store.put(validated, "active"); done();
    };
  });
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(validated));
  if (!same(previous, validated)) notify();
  return validated;
}

export async function writeAccountSnapshot(lease: Lease, data: {
  account: AuthAccount; expenses: ActivityExpense[]; updatedAt: string;
  game: GameOverview | null; gameUpdatedAt: string | null; hasMore: boolean;
}) {
  if (!same(marker(), lease)) return false;
  const snapshot = schema.parse({ version: 1, ...data });
  if (snapshot.account.account_id !== lease.accountId) return false;
  return transaction<boolean>((store, done) => {
    const request = store.get("active");
    request.onsuccess = () => {
      if (!same(marker(), lease) || !same(request.result, lease)) { done(false); return; }
      store.put(snapshot, lease.accountId); done(true);
    };
  });
}

export async function readAccountSnapshot(): Promise<AccountSnapshot | null> {
  const lease = marker();
  if (!lease) return null;
  return transaction<AccountSnapshot | null>((store, done) => {
    const active = store.get("active");
    active.onsuccess = () => {
      if (!same(lease, active.result) || !same(lease, marker())) { done(null); return; }
      const request = store.get(lease.accountId);
      request.onsuccess = () => {
        const parsed = schema.safeParse(request.result);
        done(parsed.success && parsed.data.account.account_id === lease.accountId && same(lease, marker())
          ? parsed.data : null);
      };
    };
  });
}

export async function clearAccountSnapshot(expectedAccountId?: string) {
  if (expectedAccountId && marker()?.accountId !== expectedAccountId) return;
  // Revoke reads/writes immediately, even if IndexedDB cleanup subsequently fails.
  localStorage.removeItem(ACTIVE_KEY);
  const cleanup = transaction<void>((store, done) => {
    const active = store.get("active");
    active.onsuccess = () => {
      if (!expectedAccountId || active.result?.accountId === expectedAccountId) store.clear();
      done();
    };
  });
  // Subscribers must see the queued cleanup before they navigate away.
  notify();
  await cleanup;
}

export function ownsAccountSnapshot(lease: Lease) { return same(marker(), lease); }
export function activeOfflineAccountId() { return marker()?.accountId ?? null; }
export function waitForSnapshotStorage() { return queue.catch(() => undefined); }
