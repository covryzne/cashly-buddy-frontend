"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

export const OfflineDocumentContext = createContext(false);

function subscribe(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

// This is a browser connectivity hint, not proof that an API is reachable.
export function useNetworkHint() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function useOnline() {
  const hint = useNetworkHint();
  const offlineDocument = useContext(OfflineDocumentContext);
  return hint && !offlineDocument;
}
