"use client";

import { useSyncExternalStore } from "react";

let installedInSession = false;
function snapshot() {
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
    return "standalone";
  if (installedInSession) return "installed";
  if (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
    return "ios";
  return /Android/i.test(navigator.userAgent) ? "android" : "desktop";
}
function subscribe(notify: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  const installed = () => {
    installedInSession = true;
    notify();
  };
  media.addEventListener("change", notify);
  window.addEventListener("appinstalled", installed);
  window.addEventListener("pageshow", notify);
  window.addEventListener("focus", notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("appinstalled", installed);
    window.removeEventListener("pageshow", notify);
    window.removeEventListener("focus", notify);
  };
}
export function useInstallEnvironment() {
  return useSyncExternalStore(subscribe, snapshot, () => "unknown" as const);
}
