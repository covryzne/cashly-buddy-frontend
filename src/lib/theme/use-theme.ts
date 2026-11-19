"use client";
import { useSyncExternalStore } from "react";
export type Theme = "system" | "light" | "dark";
export const themeLabels = { system: "Sistem", light: "Terang", dark: "Gelap" };
const subscribe = (notify: () => void) => {
  window.addEventListener("cashly-theme", notify);
  return () => window.removeEventListener("cashly-theme", notify);
};
function readTheme(): Theme {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" || theme === "dark" ? theme : "system";
}
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("cashly-theme", theme);
  } catch {
    /* Optional persistence. */
  }
  window.dispatchEvent(new Event("cashly-theme"));
}
export function useTheme() {
  return {
    theme: useSyncExternalStore(subscribe, readTheme, () => "system" as Theme),
    setTheme,
  };
}
