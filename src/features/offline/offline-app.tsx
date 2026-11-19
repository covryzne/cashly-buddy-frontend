"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { OfflineDocumentContext, useNetworkHint } from "@/lib/pwa/connectivity";
import { readAccountSnapshot, clearAccountSnapshot, activeOfflineAccountId, subscribeSnapshotIdentity, type AccountSnapshot } from "@/lib/pwa/account-snapshot";
import { ExpenseSessionProvider } from "@/features/expenses/expense-session";
import { ProfileSessionProvider } from "@/features/profile/profile-session";
import { AppLoader } from "@/components/shared/app-loader";
import { Button } from "@/components/ui/button";
import { HomeDashboard } from "@/features/home/home-dashboard";
import { ActivityDashboard } from "@/features/activity/activity-dashboard";
import { ReportsDashboard } from "@/features/reports/reports-dashboard";
import { ProfileDashboard } from "@/features/profile/profile-dashboard";

const subscribe = () => () => {};
// The worker preserves navigation URLs while returning the public offline shell.
export function OfflineApp() {
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const current = useRef<AccountSnapshot | null>(null);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const [connectionError, setConnectionError] = useState("");
  const network = useNetworkHint();
  useEffect(() => {
    document.documentElement.dataset.cashlyOffline = "true";
    let active = true;
    const unsubscribe = subscribeSnapshotIdentity(() => {
      if (current.current?.account.account_id !== activeOfflineAccountId()) {
        current.current = null; setSnapshot(null);
      }
    });
    void readAccountSnapshot().then(value => {
      if (active) { current.current = value; setSnapshot(value); }
    }).catch(() => { if (active) setStorageError(true); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; unsubscribe(); delete document.documentElement.dataset.cashlyOffline; };
  }, []);
  const reconnect = useCallback(async () => {
    if (!snapshot || !navigator.onLine || checkingRef.current) return;
    checkingRef.current = true; setChecking(true); setConnectionError("");
    try {
      const response = await fetch("/auth/session", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (response.status === 401 || response.status === 403 || response.status === 409) {
        await clearAccountSnapshot(snapshot.account.account_id);
        window.location.replace(response.status === 409 ? "/auth/complete" : "/login"); return;
      }
      if (!response.ok) throw new Error("Session unavailable");
      const session = await response.json();
      if (session.account_id !== snapshot.account.account_id) {
        await clearAccountSnapshot(snapshot.account.account_id);
        window.location.replace("/beranda"); return;
      }
      if (window.location.pathname === "/offline") window.location.replace("/beranda");
      else window.location.reload();
    } catch { setConnectionError("Layanan belum dapat dihubungi. Salinan data terakhir tetap bisa dibaca."); }
    finally { checkingRef.current = false; setChecking(false); }
  }, [snapshot]);
  useEffect(() => {
    if (!network || !snapshot) return;
    const timer = window.setTimeout(() => { void reconnect(); }, 0);
    return () => window.clearTimeout(timer);
  }, [network, snapshot, reconnect]);
  if (!ready) return <main className="app-loading-screen"><AppLoader /></main>;
  if (!snapshot) return <main className="local-data-empty">
    <h1>Salinan data belum tersedia</h1>
    <p>{storageError ? "Penyimpanan perangkat belum dapat dibaca." : "Masuk saat online untuk menyiapkan salinan data akun di perangkat ini."}</p>
    <a className="button button-primary" href="/login">Kembali ke masuk</a>
  </main>;
  return <OfflineDocumentContext.Provider value={true}>
    {network && <section className="local-data-status" role="status">
      <span>{checking ? "Memeriksa koneksi dan sesi…" : connectionError}</span>
      {!checking && <Button variant="secondary" onClick={() => void reconnect()}>Coba sambungkan</Button>}
    </section>}
    <ExpenseSessionProvider key={snapshot.account.account_id} offlineSnapshot remote={{
      account: snapshot.account, expenses: snapshot.expenses, game: snapshot.game,
      updatedAt: snapshot.updatedAt, sampleData: snapshot.account.sample_data,
      hasMore: snapshot.hasMore, runtime: snapshot.account.runtime,
    }}>
      <ProfileSessionProvider account={snapshot.account}><OfflineContent /></ProfileSessionProvider>
    </ExpenseSessionProvider>
  </OfflineDocumentContext.Provider>;
}
function OfflineContent() {
  const path = useSyncExternalStore(subscribe, () => window.location.pathname, () => "/offline");
  if (path === "/offline") return <main className="local-data-empty"><h1>Cashly sedang offline</h1><p>Buka Beranda untuk membaca salinan data terakhir.</p><a className="button button-primary" href="/beranda">Buka Beranda</a></main>;
  if (path === "/aktivitas") return <ActivityDashboard />;
  if (path === "/laporan") return <ReportsDashboard />;
  if (path === "/profil") return <ProfileDashboard />;
  return <HomeDashboard />;
}
