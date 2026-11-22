"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOnline } from "@/lib/pwa/connectivity";
import { loadNotificationPreferences, type NotificationPreferences } from "./notification-api";

const FRESH_FOR = 60_000;

export function useNotificationSettings() {
  const online = useOnline();
  const [preferences, setPreferences] = useState<NotificationPreferences>();
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const inFlight = useRef<AbortController | null>(null);
  const cached = useRef<{ endpoint?: string; at: number }>({ at: 0 });

  const refresh = useCallback((force = false) => {
    if (!online || inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    async function load() {
      const supportsPush = window.isSecureContext && "Notification" in window &&
        "PushManager" in window && "serviceWorker" in navigator;
      setSupported(supportsPush);
      if (supportsPush) setPermission(Notification.permission);
      const worker = supportsPush
        ? await navigator.serviceWorker.getRegistration("/").catch(() => undefined)
        : undefined;
      const subscription = await worker?.pushManager?.getSubscription().catch(() => null);
      if (controller.signal.aborted) return;
      setRegistration(worker?.active ? worker : undefined);
      const endpoint = subscription?.endpoint;
      if (!force && cached.current.endpoint === endpoint && Date.now() - cached.current.at < FRESH_FOR) return;
      const result = await loadNotificationPreferences(endpoint, controller.signal);
      if (controller.signal.aborted) return;
      cached.current = { endpoint, at: Date.now() };
      setPreferences(result);
      setError("");
    }
    void load()
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (inFlight.current === controller) inFlight.current = null;
      });
  }, [online]);

  useEffect(() => {
    if (!online) return;
    let disposed = false;
    const maybeRefresh = () => refresh();
    const controllerChanged = () => {
      void navigator.serviceWorker.getRegistration("/").then((worker) => {
        if (disposed) return;
        setRegistration(worker?.active && worker.pushManager ? worker : undefined);
        refresh();
      }).catch(() => {});
    };
    maybeRefresh();
    window.addEventListener("focus", maybeRefresh);
    navigator.serviceWorker?.addEventListener("controllerchange", controllerChanged);
    return () => {
      disposed = true;
      inFlight.current?.abort();
      inFlight.current = null;
      cached.current.at = 0;
      window.removeEventListener("focus", maybeRefresh);
      navigator.serviceWorker?.removeEventListener("controllerchange", controllerChanged);
    };
  }, [online, refresh]);

  function update(changes: Partial<NotificationPreferences>, device?: { endpoint?: string }) {
    inFlight.current?.abort();
    inFlight.current = null;
    cached.current = { endpoint: device ? device.endpoint : cached.current.endpoint, at: Date.now() };
    setPreferences((current) => current && { ...current, ...changes });
    setError("");
  }

  return { preferences, permission, setPermission, registration, supported, refresh, update, error };
}
