"use client";

import { useEffect, useEffectEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useOnline } from "@/lib/pwa/connectivity";
import { readNotification } from "./notification-api";
import { useNotificationInbox } from "./inbox-provider";

export function NotificationCaptureEntry({ onOpen }: { onOpen: () => void }) {
  const search = useSearchParams();
  const online = useOnline();
  const cache = useNotificationInbox();
  const notificationId = search.get("notif");
  const fromInbox = search.get("catat") === "1";
  const open = useEffectEvent(onOpen);
  const refreshInbox = useEffectEvent(() => cache?.refresh(true));

  useEffect(() => {
    if (!online || (!notificationId && !fromInbox)) return;
    const controller = new AbortController();

    function openCapture() {
      if (controller.signal.aborted) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get("notif") !== notificationId ||
        (url.searchParams.get("catat") === "1") !== fromInbox) return;
      url.searchParams.delete("notif");
      url.searchParams.delete("catat");
      window.history.replaceState(window.history.state, "", url);
      open();
    }

    if (fromInbox) queueMicrotask(openCapture);
    else if (notificationId && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(notificationId)) {
      void readNotification(notificationId, controller.signal).then(() => {
        if (controller.signal.aborted) return;
        refreshInbox();
        openCapture();
      }).catch(() => {});
    }
    return () => controller.abort();
  }, [online, fromInbox, notificationId]);

  return null;
}
