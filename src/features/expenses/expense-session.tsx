"use client";

import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { activityExpenses, type ActivityExpense } from "@/mocks/fixtures/activity";
import { receiptAmounts, receiptSchema, type ReceiptDraft } from "@/features/scan/receipt-schema";
import { wibDateTime } from "@/lib/format/datetime";
import { clearSnapshot, readSnapshot, writeSnapshot } from "@/lib/pwa/local-snapshot";
import { useOnline } from "@/lib/pwa/connectivity";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { ChatBatchSnapshot } from "./chat-batch";

export const localAppRoutes = ["/", "/beranda", "/aktivitas", "/laporan", "/profil", "/offline"];
type ExpenseSession = {
  expenses: ActivityExpense[];
  chatSession: ChatBatchSnapshot | null;
  setChatSession: (snapshot: ChatBatchSnapshot) => void;
  updateExpense: (id: string, draft: ReceiptDraft) => void;
  removeExpense: (id: string) => void;
  restoreExpense: (expense: ActivityExpense) => void;
  recordDrafts: (records: { id: string; draft: ReceiptDraft; source: ActivityExpense["source"] }[]) => void;
  resetSession: () => Promise<void>;
  updatedAt: string | null;
  storageError: boolean;
  persisted: boolean;
  remoteMode: boolean;
  sampleData: boolean;
  hasMore: boolean;
};
const Context = createContext<ExpenseSession | null>(null);

/** Single fictional demo namespace. No real login, API or reward authority. */
export function ExpenseSessionProvider({ children, remote }: { children: ReactNode; remote?: { expenses: ActivityExpense[]; sampleData: boolean; hasMore: boolean } }) {
  const pathname = usePathname();
  const isApp = localAppRoutes.includes(pathname);
  const online = useOnline();
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [expenses, setExpenses] = useState<ActivityExpense[]>(remote?.expenses ?? []);
  const [mutationNotice, setMutationNotice] = useState(false);
  const [chatSession, setChatSession] = useState<ChatBatchSnapshot | null>(null);
  const [ready, setReady] = useState(Boolean(remote));
  const [updatedAt, setUpdatedAt] = useState<string | null>(remote ? new Date().toISOString() : null);
  const [storageError, setStorageError] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (remote || typeof BroadcastChannel === "undefined") return;
    const broadcast = new BroadcastChannel("cashly-demo-session");
    channel.current = broadcast;
    broadcast.onmessage = (event) => {
      if (event.data !== "logout") return;
      generation.current++;
      setExpenses([]);
      setChatSession(null);
      setUpdatedAt(null);
      setPersisted(false);
      setSessionEpoch(epoch => epoch + 1);
    };
    return () => { channel.current = null; broadcast.close(); };
  }, [remote]);

  useEffect(() => {
    if (!isApp || ready) return;
    let cancelled = false;
    const version = generation.current;
    const active = () => !cancelled && generation.current === version;
    void (async () => {
      try {
        let snapshot = await readSnapshot();
        if (!active()) return;
        // An offline entry must never invent missing local records.
        if (!snapshot && navigator.onLine && pathname !== "/offline" && pathname !== "/") {
          const now = new Date().toISOString();
          await writeSnapshot(activityExpenses, now);
          snapshot = { version: 1, owner: "fictional-demo", expenses: activityExpenses, updatedAt: now };
        }
        if (!active()) return;
        setExpenses(snapshot?.expenses ?? []);
        setUpdatedAt(snapshot?.updatedAt ?? null);
        setPersisted(Boolean(snapshot));
      } catch {
        if (!active()) return;
        setStorageError(true);
        if (navigator.onLine && pathname !== "/offline" && pathname !== "/") {
          setExpenses(activityExpenses);
          setUpdatedAt(new Date().toISOString());
        }
      } finally {
        if (active()) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isApp, pathname, ready]);

  function commit(next: ActivityExpense[]) {
    if (remote) { setMutationNotice(true); return; }
    if (!navigator.onLine || !updatedAt) return;
    const now = new Date().toISOString();
    const version = generation.current;
    setExpenses(next);
    setUpdatedAt(now);
    void writeSnapshot(next, now).then(() => {
      if (generation.current === version) { setPersisted(true); setStorageError(false); }
    }).catch(() => {
      if (generation.current === version) { setStorageError(true); setPersisted(false); }
    });
  }
  async function resetSession() {
    generation.current++;
    // A failed delete keeps the logout dialog available for a visible retry.
    await clearSnapshot();
    setExpenses([]);
    setChatSession(null);
    setUpdatedAt(null);
    setPersisted(false);
    setSessionEpoch(epoch => epoch + 1);
    channel.current?.postMessage("logout");
  }

  const value: ExpenseSession = {
    expenses, chatSession, setChatSession, resetSession, updatedAt, storageError, persisted,
    remoteMode: Boolean(remote), sampleData: remote?.sampleData ?? false, hasMore: remote?.hasMore ?? false,
    updateExpense: (id, draft) => commit(expenses.map(expense => expense.id === id ? {
      ...expense, draft, merchant: draft.merchant || draft.items[0].name,
      description: draft.items.map(item => item.name).join(", "),
      categoryCode: draft.categoryCode, paymentMethod: draft.paymentMethod,
      occurredAt: wibDateTime(draft.occurredDate, draft.occurredTime),
      amountIdr: receiptAmounts(draft).total.toString(),
    } : expense)),
    removeExpense: id => commit(expenses.filter(expense => expense.id !== id)),
    restoreExpense: expense => commit(expenses.some(entry => entry.id === expense.id) ? expenses : [...expenses, expense]),
    recordDrafts: records => {
      const additions: ActivityExpense[] = records.map(({ id, draft, source }) => {
        const valid = receiptSchema.parse(draft);
        return {
          id: `local-${id}`, draft: valid, source, tags: [],
          merchant: valid.merchant || valid.items[0].name,
          description: valid.items.map(item => item.name).join(", "),
          categoryCode: valid.categoryCode, paymentMethod: valid.paymentMethod,
          occurredAt: wibDateTime(valid.occurredDate, valid.occurredTime),
          amountIdr: receiptAmounts(valid).total.toString(),
        };
      });
      const ids = new Set(additions.map(record => record.id));
      commit([...expenses.filter(record => !ids.has(record.id)), ...additions]);
    },
  };
  const unavailable = isApp && ready && !updatedAt;
  return <Context.Provider value={value}>
    {mutationNotice && <Dialog title="Data belum diubah" onClose={() => setMutationNotice(false)}><p>Data dari server tersedia untuk dibaca. Penyimpanan dan perubahan pengeluaran akan dihubungkan pada tahap berikutnya.</p></Dialog>}
    {isApp && !ready ? <main className="local-data-empty" aria-busy="true"><p role="status">Menyiapkan data Cashly…</p></main>
      : unavailable ? <main className="local-data-empty">
        <h1>Data belum tersedia di perangkat</h1>
        <p>{storageError ? "Penyimpanan lokal tidak tersedia atau tidak dapat dibaca." : "Belum ada salinan data lokal. Ini bukan berarti riwayat pengeluaranmu kosong."}</p>
        <p>{online ? "Buka pratinjau saat online untuk memuat data contoh." : "Hubungkan internet untuk membuka kembali pratinjau dan memuat data contoh."}</p>
        <Button disabled={!online} onClick={() => window.location.assign(new URL("/beranda", window.location.origin).href)}>Buka pratinjau online</Button>
      </main> : <Fragment key={sessionEpoch}>{children}</Fragment>}
  </Context.Provider>;
}
export function useExpenseSession() {
  const context = useContext(Context);
  if (!context) throw new Error("ExpenseSessionProvider is required");
  return context;
}
