"use client";
import { useEffect, type ReactNode } from "react";

export function AuthSessionBoundary({ children, accountId }: { children: ReactNode; accountId: string }) {
  useEffect(() => {
    document.documentElement.dataset.cashlyAuthReady = "true";
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cashly-auth") : null;
    const leave = () => window.location.replace("/login");
    if (channel) channel.onmessage = event => { if (event.data === "logout") leave(); else if(event.data === "account_deleted") window.location.replace("/login?account=deleted"); };
    const storage = (event: StorageEvent) => { if (event.key === "cashly-auth-logout") leave(); };
    window.addEventListener("storage", storage);
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
        if(response.status===409) {window.location.replace("/auth/complete");return;}
        if(!response.ok) {lastChecked=0;return;}
        const result=await response.json();
        if(disposed) return;
        if(result.account_id!==accountId) {window.location.replace("/auth/complete");return;}
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
      delete document.documentElement.dataset.cashlyAuthReady;
      channel?.close(); window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange",visible); window.removeEventListener("focus",visible);
      window.removeEventListener("pageshow",pageshow);window.removeEventListener("online",reconnect);
    };
  }, [accountId]);
  return children;
}

export async function logoutGoogle() {
  const response = await fetch("/auth/logout", { method: "POST", cache: "no-store" });
  if (!response.ok) throw new Error("Logout failed");
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cashly-auth") : null;
  channel?.postMessage("logout"); channel?.close();
  try { localStorage.setItem("cashly-auth-logout", String(Date.now())); } catch { /* channel still works */ }
}
