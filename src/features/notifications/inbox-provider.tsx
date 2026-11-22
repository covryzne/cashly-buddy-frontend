"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useOnline } from "@/lib/pwa/connectivity";
import { notifications, type Inbox } from "./notification-api";

const FRESH_FOR = 20_000;
const REFRESH_INTERVAL = 45_000;

type InboxContextValue = {
  inbox?: Inbox;
  error: string;
  refresh: (force?: boolean) => void;
  markAllLocally: () => void;
  clearLocally: () => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const online = useOnline();
  const [inbox, setInbox] = useState<Inbox>();
  const [error, setError] = useState("");
  const fetchedAt = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback((force = false) => {
    if (!online || document.visibilityState === "hidden") return;
    if (!force && (inFlight.current || Date.now() - fetchedAt.current < FRESH_FOR)) return;
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    void notifications<Inbox>("", { signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return;
        fetchedAt.current = Date.now();
        setInbox(value);
        setError("");
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (inFlight.current === controller) inFlight.current = null;
      });
  }, [online]);

  useEffect(() => {
    if (!online) return;
    const revalidate = () => refresh();
    revalidate();
    const timer = window.setInterval(revalidate, REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
      fetchedAt.current = 0;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [online, refresh]);

  function markAllLocally() {
    const readAt = new Date().toISOString();
    setInbox((current) => current && ({
      ...current,
      unread_count: 0,
      items: current.items.map((item) => item.read_at ? item : { ...item, read_at: readAt }),
    }));
    refresh(true);
  }

  function clearLocally() {
    inFlight.current?.abort();
    inFlight.current = null;
    fetchedAt.current = 0;
    setInbox({ items: [], unread_count: 0, next_cursor: null });
    setError("");
    refresh(true);
  }

  return (
    <InboxContext.Provider value={{ inbox, error, refresh, markAllLocally, clearLocally }}>
      {children}
    </InboxContext.Provider>
  );
}

export function useNotificationInbox() {
  return useContext(InboxContext);
}
