"use client";

import { useContext, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useExpenseSession } from "@/features/expenses/expense-session";
import { OfflineDocumentContext, useOnline } from "@/lib/pwa/connectivity";
import { prepareAssetCache } from "@/lib/assets/cache";

export function LocalDataStatus() {
  const online = useOnline();
  const offlineDocument = useContext(OfflineDocumentContext);
  const { updatedAt, storageError } = useExpenseSession();

  useEffect(() => {
    let active = true;
    void prepareAssetCache().then(ready => {
      if (!active || !ready || !online) return;
      navigator.serviceWorker.controller?.postMessage({ type: "PREPARE_OFFLINE_SHELL" });
    });
    return () => { active = false; };
  }, [online]);

  useEffect(() => {
    if (!offlineDocument) return;
    // A fallback document must reload before enabling online actions again.
    const reconnect = () => window.location.reload();
    window.addEventListener("online", reconnect);
    return () => window.removeEventListener("online", reconnect);
  }, [offlineDocument]);

  const time = updatedAt
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
      }).format(new Date(updatedAt))
    : null;

  return <>
    <section className="local-data-status" data-state={online ? "online" : "offline"}
      aria-label="Status koneksi" role="status">
      {online ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />}
      <span>{online ? "Online" : "Offline"}</span>
      {!online && time && <small>Terakhir diperbarui: <time dateTime={updatedAt!}>{time} WIB</time></small>}
    </section>
    {storageError && <p className="local-data-error" role="alert">Penyimpanan lokal gagal. Data hanya tersedia selama sesi ini; perubahan terakhir mungkin belum tersimpan di perangkat.</p>}
  </>;
}
