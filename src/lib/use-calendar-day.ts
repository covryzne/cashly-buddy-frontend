"use client";
import { useSyncExternalStore } from "react";
import { dateKey } from "./format/period";
const subscribe = (notify: () => void) => {
  const timer = window.setInterval(notify, 60000);
  window.addEventListener("focus", notify);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", notify);
  };
};
export function useCalendarDay(serverReference: string) {
  return useSyncExternalStore(
    subscribe,
    () => dateKey(new Date().toISOString()),
    () => dateKey(serverReference),
  );
}
