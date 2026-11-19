"use client";
import { AppLoader } from "@/components/shared/app-loader";

import { createContext, Fragment, useContext, useEffect, useCallback, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { activityExpenses, type ActivityExpense } from "@/mocks/fixtures/activity";
import { receiptAmounts, receiptSchema, type ReceiptDraft } from "@/features/scan/receipt-schema";
import { wibDateTime } from "@/lib/format/datetime";
import { clearSnapshot, readSnapshot, writeSnapshot } from "@/lib/pwa/local-snapshot";
import { useOnline } from "@/lib/pwa/connectivity";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiRequest, expensePayload, gameSchema, mapExpense, type GameOverview } from "@/lib/finance";
import type { AuthAccount } from "@/lib/auth/types";
import { apiExpensesSchema } from "@/lib/auth/types";
import type { ChatBatchSnapshot } from "./chat-batch";
import type { SummaryCache } from "@/features/reports/summary-cache";
import { useCalendarDay } from "@/lib/use-calendar-day";

export const localAppRoutes = ["/", "/beranda", "/aktivitas", "/laporan", "/profil", "/offline"];
type ExpenseSession = {
  expenses: ActivityExpense[];
  summaryCache: SummaryCache;
  chatSession: ChatBatchSnapshot | null;
  setChatSession: (snapshot: ChatBatchSnapshot) => void;
  updateExpense: (id: string, draft: ReceiptDraft) => Promise<boolean>;
  removeExpense: (id: string) => Promise<boolean>;
  restoreExpense: (expense: ActivityExpense) => Promise<boolean>;
  recordDrafts: (records: { id: string; draft: ReceiptDraft; source: ActivityExpense["source"] }[]) => Promise<boolean>;
  resetSession: () => Promise<void>;
  updatedAt: string | null;
  storageError: boolean;
  persisted: boolean;
  game: GameOverview | null;
  runtime: AuthAccount["runtime"];
  syncError: string;
  gameAction: (kind: "review" | "no-spend" | "freeze", day?: string[]) => Promise<boolean>;
  mutationPending: boolean;
  createExpense: (draft: ReceiptDraft) => Promise<boolean>;
  remoteMode: boolean;
  sampleData: boolean;
  hasMore: boolean;
};
const Context = createContext<ExpenseSession | null>(null);

/** Single fictional demo namespace. No real login, API or reward authority. */
export function ExpenseSessionProvider({ children, remote }: { children: ReactNode; remote?: { expenses: ActivityExpense[]; sampleData: boolean; hasMore: boolean; game?: GameOverview | null; runtime?: AuthAccount["runtime"] } }) {
  const pathname = usePathname();
  const isApp = localAppRoutes.includes(pathname);
  const online = useOnline();
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [expenses, setExpenses] = useState<ActivityExpense[]>(remote?.expenses ?? []);
  const summaryCache = useRef<SummaryCache>(new Map()).current;
  const [mutationError, setMutationError] = useState("");
  const [syncError,setSyncError]=useState("");
  const refreshing=useRef(false);
  const remoteRequestVersion=useRef(0);
  const previousPath=useRef(pathname);
  const expensesReadAt = useRef(remote ? Date.now() : 0);
  const expenseFingerprint = useRef((remote?.expenses ?? []).map(row => `${row.id}:${row.version}`).sort().join("|"));
  const gameReadAt = useRef(0);
  const gameRequest = useRef<Promise<void> | null>(null);
  const gameVersion = useRef(0);
  const [gameRevision, setGameRevision] = useState(0);
  const needsGame = pathname === "/beranda" || pathname === "/profil";
  const [mutationPending, setMutationPending] = useState(false);
  const [game, setGame] = useState<GameOverview | null>(remote?.game ?? null);
  const inFlight = useRef(false);
  const retryKeys = useRef(new Map<string,string>());
  const [chatSession, setChatSession] = useState<ChatBatchSnapshot | null>(null);
  const [ready, setReady] = useState(Boolean(remote));
  const [updatedAt, setUpdatedAt] = useState<string | null>(remote ? new Date().toISOString() : null);
  const currentDay = useCalendarDay(updatedAt ?? "2000-01-01T00:00:00Z");
  const gameDay = useRef(currentDay);
  const [storageError, setStorageError] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const generation = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    expenseFingerprint.current = expenses.map(row => `${row.id}:${row.version}`).sort().join("|");
  }, [expenses]);

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
    if (remote) return;
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

  const refreshRemote = useCallback(async () => {
    const epoch=generation.current;
    const requestVersion=++remoteRequestVersion.current;
    let page = apiExpensesSchema.parse(await apiRequest("expenses"));
    const rows = [...page.data];
    while (page.has_more && page.next_cursor) {
      page = apiExpensesSchema.parse(await apiRequest(`expenses?cursor=${encodeURIComponent(page.next_cursor)}`));
      rows.push(...page.data);
    }
    if(generation.current!==epoch || remoteRequestVersion.current!==requestVersion) return;
    expensesReadAt.current = Date.now();
    const fingerprint = rows.map(row => `${row.id}:${row.version}`).sort().join("|");
    if (fingerprint !== expenseFingerprint.current) {
      expenseFingerprint.current = fingerprint;
      setExpenses(rows.map(mapExpense)); setUpdatedAt(new Date().toISOString());
    }
    setSyncError("");
  },[]);
  const refreshGame = useCallback(async function loadGame() {
    if (gameRequest.current) return gameRequest.current;
    if (Date.now() - gameReadAt.current < 60000) return;
    const version = gameVersion.current;
    const request = (async () => {
      try {
        const result = gameSchema.parse((await apiRequest("gamification/overview")).data);
        if (version === gameVersion.current) { setGame(result); gameReadAt.current = Date.now(); }
      } catch { setSyncError("Data streak belum diperbarui. Coba lagi saat koneksi tersedia."); }
    })();
    gameRequest.current = request;
    try { await request; }
    finally { gameRequest.current = null; }
    if (version !== gameVersion.current) await loadGame();
  }, []);
  function invalidateGame() {
    gameReadAt.current = 0; ++gameVersion.current;
    setGameRevision(value => value + 1);
  }
  useEffect(() => {
    if (!remote || !needsGame || !online) return;
    if (gameDay.current !== currentDay) {
      gameDay.current = currentDay;
      gameReadAt.current = 0; ++gameVersion.current;
    }
    void refreshGame();
    const onValidated = () => { void refreshGame(); };
    window.addEventListener("cashly-session-validated", onValidated);
    return () => window.removeEventListener("cashly-session-validated", onValidated);
  }, [remote, needsGame, online, gameRevision, refreshGame, currentDay]);
  useEffect(()=>{
    if(!remote) return;
    const revalidate=()=>{
      if(inFlight.current || refreshing.current || !navigator.onLine || Date.now() - expensesReadAt.current < 60000) return;
      refreshing.current=true;
      void refreshRemote().catch(()=>setSyncError("Data belum diperbarui. Periksa koneksi dan coba kembali."))
        .finally(()=>{refreshing.current=false;});
    };
    window.addEventListener("cashly-session-validated",revalidate);
    return ()=>window.removeEventListener("cashly-session-validated",revalidate);
  },[remote,refreshRemote]);
  useEffect(()=>{
    const changed=previousPath.current!==pathname;
    previousPath.current=pathname;
    if(!changed || !remote || !navigator.onLine || inFlight.current || refreshing.current || Date.now() - expensesReadAt.current < 60000) return;
    refreshing.current=true;
    void refreshRemote().catch(()=>setSyncError("Data belum diperbarui. Periksa koneksi dan coba kembali."))
      .finally(()=>{refreshing.current=false;});
  },[pathname,remote,refreshRemote]);
  async function performRemote(path: string, method: string, body?: unknown) {
    if (!navigator.onLine || inFlight.current) return false;
    inFlight.current=true; setMutationPending(true); setMutationError("");
    const requestKey=JSON.stringify([path,method,body]);
    const key=retryKeys.current.get(requestKey) ?? crypto.randomUUID();
    retryKeys.current.set(requestKey,key);
    try {
      const response = await apiRequest(path,method,body,key);
      ++gameVersion.current;
      setGame(gameSchema.parse(response.data)); gameReadAt.current = Date.now();
      retryKeys.current.delete(requestKey); return true;
    } catch(error) {setMutationError(error instanceof Error ? error.message : "Data belum tersimpan."); return false;}
    finally {inFlight.current=false;setMutationPending(false);}
  }
  async function createExpense(draft: ReceiptDraft) {
    if (remote) return mutateExpense("expenses", "POST", expensePayload(draft));
    return value.recordDrafts([{id:crypto.randomUUID(),draft,source:"dashboard"}]);
  }
  async function mutateExpense(path: string, method: string, body?: unknown, deletedId?: string) {
    if (!navigator.onLine || inFlight.current) return false;
    inFlight.current = true;
    setMutationPending(true); setMutationError("");
    const epoch = generation.current;
    // Invalidate older reads so they cannot overwrite the confirmed edit.
    ++remoteRequestVersion.current;
    const requestKey = JSON.stringify([path, method, body]);
    const key = retryKeys.current.get(requestKey) ?? crypto.randomUUID();
    retryKeys.current.set(requestKey, key);
    try {
      const response = await apiRequest(path, method, body, key);
      const saved = deletedId ? null : mapExpense(apiExpensesSchema.shape.data.element.parse(response.data));
      if (generation.current !== epoch) return false;
      ++remoteRequestVersion.current;
      setExpenses(previous => saved ? [...previous.filter(expense => expense.id !== saved.id), saved] :
        previous.filter(expense => expense.id !== deletedId));
      expensesReadAt.current = Date.now();
      setUpdatedAt(new Date().toISOString());
      retryKeys.current.delete(requestKey);
      if (method === "POST") invalidateGame();
      return true;
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Perubahan belum tersimpan.");
      return false;
    } finally {
      inFlight.current = false; setMutationPending(false);
    }
  }
  async function gameAction(kind: "review" | "no-spend" | "freeze", day?: string[]) {
    if (!remote) return false;
    const path=kind==="freeze" ? "gamification/streak/freeze" : `gamification/checkins/${kind}`;
    return performRemote(path,"POST",kind==="freeze" ? {protected_local_dates:day} : undefined);
  }
  const value: ExpenseSession = {
    expenses, summaryCache, chatSession, setChatSession, resetSession, updatedAt, storageError, persisted,
    game, gameAction, mutationPending, createExpense, runtime:remote?.runtime, syncError,
    remoteMode: Boolean(remote), sampleData: remote?.sampleData ?? false, hasMore: remote?.hasMore ?? false,
    updateExpense: async (id, draft) => {
      if (remote) return mutateExpense(`expenses/${id}`, "PATCH", expensePayload(draft, expenses.find(e=>e.id===id)?.version));
      commit(expenses.map(expense => expense.id === id ? {
      ...expense, draft, merchant: draft.merchant || draft.items[0].name,
      description: draft.items.map(item => item.name).join(", "),
      categoryCode: draft.categoryCode, paymentMethod: draft.paymentMethod,
      occurredAt: wibDateTime(draft.occurredDate, draft.occurredTime),
      amountIdr: receiptAmounts(draft).total.toString(),
    } : expense)); return true; },
    removeExpense: async id => {
      if (remote) return mutateExpense(`expenses/${id}?version=${expenses.find(e=>e.id===id)?.version ?? 1}`,"DELETE", undefined, id);
      commit(expenses.filter(expense=>expense.id!==id));return true;
    },
    restoreExpense: async expense => {
      if (remote) return mutateExpense(`expenses/${expense.id}/restore`,"POST");
      commit(expenses.some(entry=>entry.id===expense.id) ? expenses : [...expenses,expense]);return true;
    },
    recordDrafts: async records => {
      if (remote) {
        if (records.some(record => record.source !== "chat")) {
          setMutationError("Pemrosesan OCR dan suara belum dihubungkan."); return false;
        }
        if (!navigator.onLine || inFlight.current || !records.length) return false;
        inFlight.current = true; setMutationPending(true); setMutationError("");
        try {
          const body = { records: records.map(record => ({
            id: record.id, expense: expensePayload(receiptSchema.parse(record.draft)),
          })) };
          // Stable across a close/reopen or uncertain HTTP response. Changed payloads conflict.
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
            JSON.stringify(records.map(record => record.id)),
          ));
          const key = `chat-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,"0")).join("")}`;
          const response = await apiRequest("expenses/chat-batch", "POST", body, key);
          const saved = apiExpensesSchema.parse({ ...response, has_more: false, next_cursor: null }).data.map(mapExpense);
          const savedIds = new Set(saved.map(row => row.id));
          setExpenses(previous => [...previous.filter(row => !savedIds.has(row.id)), ...saved]);
          ++remoteRequestVersion.current; expensesReadAt.current = Date.now();
          setUpdatedAt(new Date().toISOString());
          invalidateGame();
          return true;
        } catch (error) {
          setMutationError(error instanceof Error ? error.message : "Pengeluaran belum tersimpan.");
          return false;
        } finally { inFlight.current = false; setMutationPending(false); }
      }
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
      commit([...expenses.filter(record => !ids.has(record.id)), ...additions]); return true;
    },
  };
  const unavailable = isApp && ready && !updatedAt;
  return <Context.Provider value={value}>
    {mutationError && <Dialog title="Permintaan belum selesai" onClose={() => setMutationError("")}><p role="alert">{mutationError}</p></Dialog>}
    {isApp && !ready ? <main className="app-loading-screen" aria-busy="true"><AppLoader /></main>
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
