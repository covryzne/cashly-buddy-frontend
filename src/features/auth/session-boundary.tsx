"use client";
import { useEffect, useState, type ReactNode } from "react";
import { clearAccountSnapshot, activeOfflineAccountId, subscribeSnapshotIdentity, waitForSnapshotStorage } from "@/lib/pwa/account-snapshot";
import { AppLoader } from "@/components/shared/app-loader";
import { disableDevicePush } from "@/features/notifications/notification-api";
import { useAppThemeDefault } from "@/lib/theme/use-theme";

export function AuthSessionBoundary({ children, accountId }: { children: ReactNode; accountId: string }) {
  useAppThemeDefault();
  const [invalidated, setInvalidated] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.cashlyAuthReady = "true";
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cashly-auth") : null;
    const leave = () => {
      setInvalidated(true);
      void clearAccountSnapshot(accountId).catch(() => undefined).finally(() => window.location.replace("/login"));
    };
    if (channel) channel.onmessage = event => { if (event.data === "logout") leave(); else if(event.data === "account_deleted") window.location.replace("/login?account=deleted"); };
    const storage = (event: StorageEvent) => { if (event.key === "cashly-auth-logout") leave(); };
    window.addEventListener("storage", storage);
    const unsubscribe = subscribeSnapshotIdentity(() => {
      const active = activeOfflineAccountId();
      if (active !== accountId) {
        setInvalidated(true);
        void waitForSnapshotStorage().finally(() => window.location.replace(activeOfflineAccountId() ? "/beranda" : "/login"));
      }
    });
    let checking=false;
    let lastChecked=0;
    let disposed=false;
    const controller=new AbortController();
    async function validate(force=false) {
      if(checking || !navigator.onLine || document.visibilityState!=="visible" || (!force && Date.now()-lastChecked<30000)) return;
      checking=true; lastChecked=Date.now();
      try {
        const response=await fetch("/auth/session",{cache:"no-store",signal:controller.signal});
        if(disposed) return;
        if(response.status===401 || response.status===403) {leave();return;}
        if(response.status===409) {await clearAccountSnapshot(accountId);window.location.replace("/auth/complete");return;}
        if(!response.ok) {lastChecked=0;return;}
        const result=await response.json();
        if(disposed) return;
        if(result.account_id!==accountId) {await clearAccountSnapshot(accountId);window.location.replace("/beranda");return;}
        window.dispatchEvent(new Event("cashly-session-validated"));
      } catch {lastChecked=0;}
      finally {checking=false;}
    }
    const visible=()=>{void validate();};
    const pageshow=(event:PageTransitionEvent)=>{if(event.persisted) void validate(true);};
    const reconnect=()=>{void validate(true);};
    document.addEventListener("visibilitychange",visible);
    window.addEventListener("focus",visible);
    window.addEventListener("pageshow",pageshow);
    window.addEventListener("online",reconnect);
    return () => {
      disposed=true;controller.abort();
      unsubscribe();
      delete document.documentElement.dataset.cashlyAuthReady;
      channel?.close(); window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange",visible); window.removeEventListener("focus",visible);
      window.removeEventListener("pageshow",pageshow);window.removeEventListener("online",reconnect);
    };
  }, [accountId]);
  return invalidated ? <main className="app-loading-screen"><AppLoader /></main> : children;
}

export async function logoutGoogle() {
  await disableDevicePush();
  const response = await fetch("/auth/logout", { method: "POST", cache: "no-store" });
  if (!response.ok) throw new Error("Logout failed");
  await clearAccountSnapshot().catch(() => undefined);
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cashly-auth") : null;
  channel?.postMessage("logout"); channel?.close();
  try { localStorage.setItem("cashly-auth-logout", String(Date.now())); } catch { /* channel still works */ }
}
