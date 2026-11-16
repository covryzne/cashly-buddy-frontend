"use client";
import { useEffect, type ReactNode } from "react";

export function AuthSessionBoundary({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.cashlyAuthReady = "true";
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cashly-auth") : null;
    const leave = () => window.location.replace("/login");
    if (channel) channel.onmessage = event => { if (event.data === "logout") leave(); };
    const storage = (event: StorageEvent) => { if (event.key === "cashly-auth-logout") leave(); };
    window.addEventListener("storage", storage);
    const validate = () => { if (document.visibilityState === "visible") window.location.reload(); };
    const pageshow = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    document.addEventListener("visibilitychange", validate);
    window.addEventListener("pageshow", pageshow);
    return () => {
      delete document.documentElement.dataset.cashlyAuthReady;
      channel?.close(); window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", validate); window.removeEventListener("pageshow", pageshow);
    };
  }, []);
  return children;
}

export async function logoutGoogle() {
  const response = await fetch("/auth/logout", { method: "POST", cache: "no-store" });
  if (!response.ok) throw new Error("Logout failed");
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("cashly-auth") : null;
  channel?.postMessage("logout"); channel?.close();
  try { localStorage.setItem("cashly-auth-logout", String(Date.now())); } catch { /* channel still works */ }
}
