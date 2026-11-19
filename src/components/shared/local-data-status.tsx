"use client";

import { useContext, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useExpenseSession } from "@/features/expenses/expense-session";
import { OfflineDocumentContext, useOnline } from "@/lib/pwa/connectivity";
import { prepareAssetCache } from "@/lib/assets/cache";

export function LocalDataStatus() {
  const online = useOnline();
  const offlineDocument = useContext(OfflineDocumentContext);
  const { updatedAt, storageError, remoteMode, hasMore, runtime, syncError, persisted } = useExpenseSession();

  useEffect(() => {
    let active = true;
    const prepare = () => {
      if (active && online && navigator.onLine)
        navigator.serviceWorker.controller?.postMessage({ type: "PREPARE_OFFLINE_SHELL" });
    };
    navigator.serviceWorker?.addEventListener("controllerchange", prepare);
    void prepareAssetCache().then(ready => {
      if (!active || !ready || !online) return;
      prepare();
    });
    return () => { active = false; navigator.serviceWorker?.removeEventListener("controllerchange", prepare); };
  }, [online]);

  const time = updatedAt
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
      }).format(new Date(updatedAt))
    : null;

  return <>
    {remoteMode && runtime && runtime.environment!=="prod" && <p className="environment-indicator" data-environment={runtime.environment}>
      <span>{runtime.environment==="dev" ? "Development" : "Staging"}</span>
      <small>{runtime.database_kind==="local" ? "Database lokal" : `Database ${runtime.environment==="staging" ? "staging" : "development"}`}</small>
    </p>}
    {hasMore && <p className="caption">Masih ada transaksi lain yang belum dimuat.</p>}
    {syncError && <p className="caption" role="status">{syncError}</p>}
    <section className="local-data-status" data-state={online ? "online" : "offline"}
      aria-label="Status koneksi" role="status">
      {online ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
      <span>{online ? "Online" : "Offline"}</span>
      {!online && time && <small>Terakhir diperbarui: <time dateTime={updatedAt!}>{time} WIB</time></small>}
    </section>
    {remoteMode && !online && <p className="caption">Salinan data terakhir. Pencatatan dan perubahan tersedia saat online.</p>}
    {remoteMode && online && persisted && !offlineDocument && <p className="caption">Salinan data tersimpan di perangkat ini.</p>}
    {storageError && <p className="local-data-error" role="alert">Penyimpanan lokal gagal. Data hanya tersedia selama sesi ini; perubahan terakhir mungkin belum tersimpan di perangkat.</p>}
  </>;
}
